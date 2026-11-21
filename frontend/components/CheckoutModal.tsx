import React, { useEffect, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspace } from '../lib/workspace';
import { DevUser } from '../types';
import { Button, Modal, Segmented } from './ui';

const PLAN_INFO = {
  pro: {
    name: 'Pro',
    price: 15,
    period: 'per member / month',
    points: ['Pro badge across the workspace', 'Early access to new modules', 'Priority on feature requests'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    period: 'per workspace / month',
    points: ['Everything in Pro', 'Self-hosting guidance and SSO setup help', 'Shared support channel'],
  },
};

export default function CheckoutModal({ plan: initialPlan, onClose }: { plan: 'pro' | 'enterprise'; onClose: () => void }) {
  const { user, setUser } = useWorkspace();
  const [plan, setPlan] = useState(initialPlan);
  const [mode, setMode] = useState<'demo' | 'live' | null>(null);
  const [card, setCard] = useState({ number: '4242 4242 4242 4242', expiry: '12 / 30', cvc: '123', name: user.username });
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const info = PLAN_INFO[plan];
  const alreadyOn = user.tier === info.name;

  useEffect(() => {
    api<{ mode: 'demo' | 'live' }>('/api/payments/config')
      .then((c) => setMode(c.mode))
      .catch(() => setMode('demo'));
  }, []);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (card.number.replace(/\s/g, '').length < 15) return setError('Enter the full card number.');
    if (!/^\d{2}\s?\/\s?\d{2}$/.test(card.expiry)) return setError('Enter the expiry as MM / YY.');
    setPaying(true);
    try {
      const intent = await api<{ paymentIntentId: string; isDemo: boolean }>('/api/payments/create-payment-intent', { body: { plan } });
      const res = await api<{ user: DevUser }>('/api/payments/confirm-payment', { body: { plan, paymentIntentId: intent.paymentIntentId } });
      setUser(res.user);
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={done ? `You are on ${info.name}` : `Upgrade to ${info.name}`} width={460}>
      {done ? (
        <div className="py-2">
          <p className="text-[13.5px] text-ink-2">Your {info.name} badge now shows next to your name for everyone in the workspace.</p>
          <Button variant="primary" className="mt-5 w-full" onClick={onClose}>
            Back to the workspace
          </Button>
        </div>
      ) : (
        <form onSubmit={pay} className="space-y-4">
          <Segmented<'pro' | 'enterprise'>
            value={plan}
            onChange={setPlan}
            options={[
              { value: 'pro', label: 'Pro · $15' },
              { value: 'enterprise', label: 'Enterprise · $99' },
            ]}
          />
          <div className="rounded-lg border border-line bg-canvas p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">{info.name}</span>
              <span>
                <span className="font-display text-[22px] font-semibold">${info.price}</span>
                <span className="text-[12px] text-ink-3"> {info.period}</span>
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {info.points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-[12.5px] text-ink-2">
                  <Check size={13} className="mt-0.5 text-ink" /> {p}
                </li>
              ))}
            </ul>
          </div>

          {mode === 'demo' && (
            <p className="rounded-lg bg-warn/10 px-3 py-2 text-[12.5px] text-warn">
              Demo mode: no card is charged. Add <span className="font-mono">STRIPE_SECRET_KEY</span> on the server to take real payments.
            </p>
          )}

          {mode === 'live' && (
            <p className="rounded-lg bg-subtle px-3 py-2 text-[12.5px] text-ink-2">
              A Stripe key is configured, but secure card entry (Stripe Payment Element) is not wired into this build yet, so live checkout is
              disabled. See the README.
            </p>
          )}

          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="cc-num">
                Card number
              </label>
              <input
                id="cc-num"
                className="field font-mono"
                inputMode="numeric"
                autoComplete="cc-number"
                value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, '').slice(0, 23) })}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label" htmlFor="cc-exp">
                  Expiry
                </label>
                <input
                  id="cc-exp"
                  className="field font-mono"
                  autoComplete="cc-exp"
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: e.target.value.slice(0, 7) })}
                />
              </div>
              <div>
                <label className="label" htmlFor="cc-cvc">
                  CVC
                </label>
                <input
                  id="cc-cvc"
                  className="field font-mono"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  value={card.cvc}
                  onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                />
              </div>
              <div>
                <label className="label" htmlFor="cc-name">
                  Name
                </label>
                <input
                  id="cc-name"
                  className="field"
                  autoComplete="cc-name"
                  value={card.name}
                  onChange={(e) => setCard({ ...card, name: e.target.value })}
                />
              </div>
            </div>
          </div>
          {error && <p className="text-[12.5px] text-err">{error}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={paying} disabled={alreadyOn || mode !== 'demo'}>
            <Lock size={14} /> {alreadyOn ? `You are already on ${info.name}` : `Pay $${info.price}.00`}
          </Button>
        </form>
      )}
    </Modal>
  );
}
