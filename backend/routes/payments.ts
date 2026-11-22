import express from 'express';
import Stripe from 'stripe';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { getIO, broadcastPresence } from '../realtime';
import { PlanTier } from '../../frontend/types';

const router = express.Router();

export const PLANS: Record<'pro' | 'enterprise', { name: string; tier: PlanTier; amountCents: number }> = {
  pro: { name: 'Pro', tier: 'Pro', amountCents: 1500 },
  enterprise: { name: 'Enterprise', tier: 'Enterprise', amountCents: 9900 },
};

let stripeInstance: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeInstance) stripeInstance = new Stripe(key);
  return stripeInstance;
}

router.get('/config', (_req, res) => {
  res.json({ mode: getStripe() ? 'live' : 'demo', plans: PLANS });
});

/** Starts a checkout. The amount always comes from the server-side plan table, never the client. */
router.post('/create-payment-intent', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const planKey = req.body?.plan as keyof typeof PLANS;
    const plan = PLANS[planKey];
    if (!plan) return res.status(400).json({ error: 'Choose the Pro or Enterprise plan.' });

    const stripe = getStripe();
    if (stripe) {
      const intent = await stripe.paymentIntents.create({
        amount: plan.amountCents,
        currency: 'usd',
        metadata: { userId: req.user!.userId, plan: planKey },
        description: `Lemo ${plan.name}`,
        automatic_payment_methods: { enabled: true },
      });
      return res.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id, isDemo: false, plan: planKey });
    }

    return res.json({
      clientSecret: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      paymentIntentId: `demo_pi_${Date.now()}`,
      isDemo: true,
      plan: planKey,
    });
  } catch (error: any) {
    console.error('[payments] create intent failed:', error);
    return res.status(500).json({ error: error.message || 'Could not start checkout.' });
  }
});

router.post('/confirm-payment', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const planKey = req.body?.plan as keyof typeof PLANS;
    const plan = PLANS[planKey];
    const paymentIntentId = String(req.body?.paymentIntentId || '');
    if (!plan) return res.status(400).json({ error: 'Choose the Pro or Enterprise plan.' });

    const stripe = getStripe();
    if (stripe) {
      // In live mode, only upgrade once Stripe reports the payment as complete.
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status !== 'succeeded' || intent.metadata.userId !== req.user!.userId) {
        return res.status(402).json({ error: 'Stripe has not confirmed this payment yet.' });
      }
    } else if (!paymentIntentId.startsWith('demo_')) {
      return res.status(400).json({ error: 'Unknown payment reference.' });
    }

    const user = db.getUser(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'This account no longer exists.' });
    const updated = db.saveUser({ ...user, tier: plan.tier, paymentStatus: 'paid', paymentIntentId });
    getIO()?.emit('user:updated', updated);
    broadcastPresence();
    return res.json({ success: true, user: updated });
  } catch (error: any) {
    console.error('[payments] confirm failed:', error);
    return res.status(500).json({ error: error.message || 'Could not confirm the payment.' });
  }
});

export default router;
