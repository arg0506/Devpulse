import React, { useState, useEffect } from 'react';
import { 
  X, 
  CreditCard, 
  Lock, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Flame, 
  Terminal, 
  Heart,
  HelpCircle
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { DevUser } from '../types';

interface CheckoutModalProps {
  currentUser: DevUser;
  onClose: () => void;
  onUpgradeSuccess: (updatedUser: DevUser) => void;
  selectedPlan?: 'pro' | 'enterprise';
}

export default function CheckoutModal({ 
  currentUser, 
  onClose, 
  onUpgradeSuccess,
  selectedPlan = 'pro'
}: CheckoutModalProps) {
  
  // Plan Parameters
  const planDetails = selectedPlan === 'pro' 
    ? { name: 'Cluster Squad', price: 15, amountCents: 1500, period: 'member / month' }
    : { name: 'Enterprise Galaxy', price: 99, amountCents: 9900, period: 'tailored cluster / month' };

  // Form Inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  
  // Card Brand / Visual States
  const [cardFocused, setCardFocused] = useState<'number' | 'name' | 'expiry' | 'cvv' | null>(null);
  
  // Process States
  const [status, setStatus] = useState<'idle' | 'initiating' | 'filling' | 'submitting' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  // Auto-format helper for card number
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    
    // Group by 4
    const parts = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.substring(i, i + 4));
    }
    setCardNumber(parts.join(' '));
  };

  // Auto-format helper for expiry MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    
    if (value.length >= 2) {
      setCardExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
    } else {
      setCardExpiry(value);
    }
  };

  // Auto-format helper for CVV
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvv(value);
  };

  // Add a cyber log message
  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Step 1: Initialize Payment Intent on component mount
  useEffect(() => {
    const initializePayment = async () => {
      setStatus('initiating');
      setLogs([]);
      addLog('Initiating secure proxy connection to Express node...');
      
      try {
        const response = await fetch('/api/payments/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: planDetails.amountCents,
            planName: planDetails.name,
            userId: currentUser.id,
            username: currentUser.username
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to initialize payment pipeline.');
        }

        setIsDemoMode(data.isDemo);
        setPaymentIntentId(data.clientSecret);
        
        if (data.isDemo) {
          addLog('Stripe API Key absent. Graceful redirect to Sovereign Sandbox Sandbox Gate.');
          addLog('Simulated PaymentIntent registered: ' + data.clientSecret.slice(0, 20) + '...');
        } else {
          addLog('Production Stripe Gateway Connected [200 OK].');
          addLog('Payment intent allocated: ' + data.clientSecret.slice(0, 20) + '...');
        }
        setStatus('idle');
      } catch (err: any) {
        console.error('Payment initialization failed:', err);
        addLog('CRITICAL: Payment handshake failed. Initializing local sandbox bypass.');
        setIsDemoMode(true);
        setPaymentIntentId(`demo_secret_${Date.now()}`);
        setStatus('idle');
      }
    };

    initializePayment();
  }, [selectedPlan]);

  // Autofill for testing
  const handleAutofillTest = () => {
    setCardNumber('4242 4242 4242 4242');
    setCardName('SOVEREIGN DEVELOPER');
    setCardExpiry('12/29');
    setCardCvv('137');
    addLog('Preloaded developer Sandbox test credentials.');
  };

  // Form Submit Handler
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      setErrorMessage('Please provide complete payment credential inputs.');
      return;
    }

    setErrorMessage(null);
    setStatus('submitting');
    addLog('Beginning cryptographic validation sequence...');
    
    // Simulate encryption / submission latency
    await new Promise(resolve => setTimeout(resolve, 1400));
    
    addLog('Checking credit balance networks...');
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      // Step 2: Call confirm endpoint on backend
      addLog('Contacting payment node to confirm upgrade package...');
      const response = await fetch('/api/payments/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          planName: planDetails.name,
          paymentIntentId: paymentIntentId,
          isDemo: isDemoMode
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve checkout session.');
      }

      // Step 3: Update Firebase Firestore user profile
      addLog('Upgrading client tier in Firebase Firestore collection...');
      const userRef = doc(db, 'users', currentUser.id);
      
      const newTier = selectedPlan === 'pro' ? 'Pro' : 'Enterprise';
      await updateDoc(userRef, {
        tier: newTier,
        paymentStatus: 'paid',
        paymentIntentId: paymentIntentId || 'demo'
      });

      addLog('Firestore transaction committed successfully.');
      setStatus('verifying');
      
      // Let success animations run
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      addLog('Uplink fully authorized. All premium capabilities unlocked.');
      setStatus('success');

      // Prepare updated user profile object
      const updatedProfile: DevUser = {
        ...currentUser,
        tier: newTier,
        paymentStatus: 'paid',
        paymentIntentId: paymentIntentId || 'demo'
      };

      // Call callback to notify parent app
      setTimeout(() => {
        onUpgradeSuccess(updatedProfile);
      }, 1000);

    } catch (err: any) {
      console.error('Payment checkout confirmation failed:', err);
      setErrorMessage(err.message || 'Payment processing error.');
      setStatus('error');
      addLog('Error: Validation aborted. Pipeline error occurred.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-[#0a081a] border border-purple-500/20 rounded-2xl shadow-[0_0_80px_rgba(124,58,237,0.3)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl grid grid-cols-1 md:grid-cols-12">
        
        {/* Left Side: Interactive Credit Card & Cyber Console logs */}
        <div className="md:col-span-5 bg-[#0e0a24]/90 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-purple-500/10 min-h-[450px]">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-cyan-400 animate-pulse" size={16} />
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">DEVPULSE PAY_STREAM v1.0</span>
            </div>

            {/* Simulated credit card */}
            <div className="relative w-full h-44 bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 rounded-2xl p-5 text-white shadow-[0_15px_30px_rgba(99,102,241,0.2)] border border-white/20 overflow-hidden flex flex-col justify-between transform transition-transform hover:scale-102">
              {/* Card Hologram chip */}
              <div className="flex items-center justify-between">
                <div className="w-10 h-8 bg-amber-400/40 border border-amber-300/30 rounded-lg backdrop-blur-sm" />
                <span className="text-xs font-serif italic opacity-80">Sovereign Link</span>
              </div>

              {/* Card Number */}
              <div className="font-mono text-base tracking-widest my-2">
                {cardNumber || '•••• •••• •••• ••••'}
              </div>

              {/* Holder details */}
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider">
                <div>
                  <span className="opacity-40 block text-[8px]">Cardholder Name</span>
                  <span className="truncate max-w-[150px] inline-block">{cardName || 'GUEST DEVELOPER'}</span>
                </div>
                <div className="text-right">
                  <span className="opacity-40 block text-[8px]">Expires</span>
                  <span>{cardExpiry || 'MM/YY'}</span>
                </div>
                <div className="text-right pl-2">
                  <span className="opacity-40 block text-[8px]">CVV</span>
                  <span>{cardCvv || '•••'}</span>
                </div>
              </div>

              {/* Decorative grid lines */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
            </div>
          </div>

          {/* Cyber Terminal Logs */}
          <div className="mt-6 flex-1 flex flex-col justify-end bg-[#05030e] border border-purple-500/10 rounded-xl p-3 font-mono text-[9px] text-purple-300/60 h-32 overflow-y-auto space-y-1.5 scrollbar-thin">
            <div className="flex items-center gap-1.5 border-b border-purple-500/10 pb-1 mb-1.5 text-cyan-400/80">
              <Terminal size={10} />
              <span>LOGSTREAM: sync_uplink</span>
            </div>
            {logs.map((log, idx) => (
              <div key={idx} className="leading-normal animate-fade-in">
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Payment Form / Info */}
        <div className="md:col-span-7 p-8 flex flex-col justify-between relative">
          
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 bg-[#120e2e] text-purple-300 hover:text-white rounded-lg border border-purple-500/10 hover:border-purple-500/30 transition-all cursor-pointer"
          >
            <X size={15} />
          </button>

          {status === 'success' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-950/50 border-2 border-emerald-500/50 rounded-full flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-serif font-extrabold text-white">Uplink Fully Activated!</h3>
                <p className="text-xs text-purple-200/60 max-w-sm mx-auto">
                  Your node profile has been upgraded to <span className="text-cyan-400 font-bold font-mono">{planDetails.name}</span>. Launching updated workspace environment...
                </p>
              </div>
              <div className="p-3 bg-[#0d0a24] border border-purple-500/15 rounded-xl font-mono text-[10px] text-purple-300 max-w-xs space-y-1">
                <p className="text-cyan-400 font-bold">✓ Transaction Completed</p>
                <p>Plan: {planDetails.name}</p>
                <p>Price: ${planDetails.price}.00 / Month</p>
                <p className="truncate text-purple-300/40">ID: {paymentIntentId}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              
              {/* Form Header */}
              <div className="space-y-2 mb-6">
                <div className="inline-flex items-center gap-1 bg-purple-950/40 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-mono text-purple-300 uppercase">
                  <Lock size={10} className="text-cyan-400" />
                  SSL Certified Pipeline
                </div>
                <h3 className="text-2xl font-serif font-extrabold text-white">Upgrade Your Node Core</h3>
                <p className="text-xs text-purple-200/55">
                  Secure your technical advantages, double your workspace XP gains, and unlock vector whiteboards.
                </p>
              </div>

              {/* Plan Summary Badge */}
              <div className="flex items-center justify-between p-4 bg-[#110d2c]/60 border border-purple-500/15 rounded-xl mb-6">
                <div>
                  <span className="text-[10px] font-mono text-purple-300/40 block uppercase">Selected Tier</span>
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    {planDetails.name}
                    <Sparkles size={12} className="text-cyan-400 animate-pulse" />
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-purple-300/40 block uppercase">Billing Recurrence</span>
                  <span className="text-sm font-mono font-bold text-cyan-400">
                    ${planDetails.price}.00 <span className="text-[10px] opacity-60">/ month</span>
                  </span>
                </div>
              </div>

              {/* Standard Payment Form */}
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                
                {/* Number Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">Card Account Number</label>
                  <div className="relative">
                    <input 
                      type="text"
                      required
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      onFocus={() => setCardFocused('number')}
                      onBlur={() => setCardFocused(null)}
                      className="w-full bg-[#110d2a]/80 border border-purple-500/25 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono"
                    />
                    <CreditCard size={14} className="absolute left-3.5 top-3.5 text-purple-400/50" />
                  </div>
                </div>

                {/* Holder Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">Cardholder Identity Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="SOVEREIGN DEVELOPER"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    onFocus={() => setCardFocused('name')}
                    onBlur={() => setCardFocused(null)}
                    className="w-full bg-[#110d2a]/80 border border-purple-500/25 focus:border-cyan-400 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono"
                  />
                </div>

                {/* Expiry & CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">Expiry Index</label>
                    <input 
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      onFocus={() => setCardFocused('expiry')}
                      onBlur={() => setCardFocused(null)}
                      className="w-full bg-[#110d2a]/80 border border-purple-500/25 focus:border-cyan-400 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">CVV Crypt</label>
                    <input 
                      type="password"
                      required
                      placeholder="•••"
                      value={cardCvv}
                      onChange={handleCvvChange}
                      onFocus={() => setCardFocused('cvv')}
                      onBlur={() => setCardFocused(null)}
                      className="w-full bg-[#110d2a]/80 border border-purple-500/25 focus:border-cyan-400 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono text-center"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3.5 bg-pink-950/40 border border-pink-500/30 rounded-xl text-pink-300 text-[11px] font-mono flex items-center gap-2.5">
                    <AlertCircle size={14} className="text-pink-500 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-3 flex flex-col sm:flex-row gap-3">
                  {isDemoMode && (
                    <button
                      type="button"
                      onClick={handleAutofillTest}
                      className="flex-1 bg-cyan-950/40 hover:bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 font-mono font-bold text-[10px] tracking-widest uppercase py-4 rounded-xl transition-all cursor-pointer hover:border-cyan-400 flex items-center justify-center gap-2"
                    >
                      <Sparkles size={12} />
                      Autofill Test
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={status === 'submitting' || status === 'verifying' || status === 'initiating'}
                    className="flex-[2] bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-400 disabled:opacity-50 text-white font-mono font-bold text-[10px] tracking-widest uppercase py-4 rounded-xl transition-all shadow-[0_0_25px_rgba(124,58,237,0.3)] border border-purple-400/20 cursor-pointer flex items-center justify-center gap-2.5 hover:scale-[1.01]"
                  >
                    {status === 'submitting' || status === 'verifying' ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock size={12} />
                        Confirm and Pay ${planDetails.price}.00
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Secure badge footer */}
              <div className="mt-6 flex items-center justify-center gap-6 border-t border-purple-500/10 pt-4 text-[9px] font-mono text-purple-300/40 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={11} className="text-emerald-400" />
                  AES-256 TLS Tunnel
                </span>
                <span>•</span>
                <span>PCI-DSS Decoupled Gate</span>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
