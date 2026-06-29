import express from 'express';
import Stripe from 'stripe';
import { db } from '../db';

const router = express.Router();

// Lazy initialization helper for Stripe to prevent startup crashes if key is missing
let stripeInstance: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return null;
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, {
      apiVersion: '2023-10-16' as any, // standard API version
    });
  }
  return stripeInstance;
}

/**
 * POST /api/payments/create-payment-intent
 * Initiates a checkout transaction. Returns clientSecret or a Demo session.
 */
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, planName, userId, username } = req.body;

    if (!amount || !planName || !userId) {
      return res.status(400).json({ error: 'Missing required parameters (amount, planName, userId)' });
    }

    const stripe = getStripe();
    if (stripe) {
      // Create a real Stripe PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount, // in cents, e.g., 1500 for $15.00
        currency: 'usd',
        metadata: {
          userId,
          username: username || 'unknown_user',
          planName,
        },
        description: `DevPulse Upgrade: ${planName}`,
      });

      return res.json({
        clientSecret: paymentIntent.client_secret,
        isDemo: false,
        amount,
        planName,
      });
    } else {
      // Graceful fallback to Sandbox/Demo mode
      console.log(`[Stripe Payments] No STRIPE_SECRET_KEY found. Issuing simulated sandbox session.`);
      return res.json({
        clientSecret: `demo_secret_devpulse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        isDemo: true,
        amount,
        planName,
      });
    }
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/payments/confirm-payment
 * Complete and record the payment in our databases, upgrading the user tier.
 */
router.post('/confirm-payment', (req, res) => {
  try {
    const { userId, planName, paymentIntentId, isDemo } = req.body;

    if (!userId || !planName) {
      return res.status(400).json({ error: 'Missing required fields (userId, planName)' });
    }

    // Determine target tier based on planName
    let tier: 'Sovereign' | 'Pro' | 'Enterprise' = 'Sovereign';
    if (planName.toLowerCase().includes('cluster') || planName.toLowerCase().includes('squad') || planName.toLowerCase().includes('pro')) {
      tier = 'Pro';
    } else if (planName.toLowerCase().includes('enterprise') || planName.toLowerCase().includes('galaxy')) {
      tier = 'Enterprise';
    }

    // Retrieve and update user in our local Express backend database memory/file store
    const user = db.getUser(userId);
    if (user) {
      const updatedUser = {
        ...user,
        tier,
        paymentStatus: 'paid',
        paymentIntentId: paymentIntentId || `simulated_${Date.now()}`
      } as any;
      
      db.saveUser(updatedUser);
      console.log(`[Payments Core] Successfully upgraded user ${userId} to ${tier} tier.`);
      return res.json({
        success: true,
        user: updatedUser,
        message: `Successfully provisioned ${tier} tier capability context.`
      });
    } else {
      // If user is registered on Firebase first but hasn't entered workspace DB,
      // create or return a response that can be handled.
      return res.json({
        success: true,
        message: `Database signal queued. Please register your handle in the workspace to active the tier.`,
        pendingTier: tier
      });
    }
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
