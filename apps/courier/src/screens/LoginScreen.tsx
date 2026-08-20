import { isValidEgyptianPhone } from '@sprintgo/shared';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

export function LoginScreen() {
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const phoneValid = isValidEgyptianPhone(phone);

  async function send() {
    if (!phoneValid || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await requestOtp(phone.trim());
      setDevCode(res.devCode ?? '');
      setStep('otp');
      setCode('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'حصلت مشكلة بسيطة، حاوِل تاني من فضلك');
    } finally {
      setLoading(false);
    }
  }

  async function verify(value = code) {
    if (value.length !== 4 || loading) return;
    setLoading(true);
    setError('');
    try {
      await verifyOtp(phone.trim(), value);
      // AuthProvider flips isLoggedIn → the app renders the courier home
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'الكود مش مظبوط، حاوِل تاني من فضلك');
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sg-screen" style={{ justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 22,
            margin: '0 auto 18px',
            background: 'linear-gradient(145deg,#16A34A,#15803D)',
            boxShadow: '0 14px 30px rgba(34,197,94,.32)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontSize: 24,
            fontWeight: 800,
          }}
        >
          كابتن
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A' }}>سبرنت جو كابتن</div>
        <div style={{ fontSize: 15, color: '#64748B', marginTop: 6 }}>
          {step === 'phone' ? 'ادخل رقمك المسجّل عشان نبعتلك كود' : 'اكتب الكود اللي وصلك'}
        </div>
      </div>

      {step === 'phone' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 11))}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            type="tel"
            inputMode="tel"
            dir="ltr"
            placeholder="01XXXXXXXXX"
            style={inputStyle}
          />
          {error && <div style={errStyle}>{error}</div>}
          <button type="button" onClick={send} disabled={!phoneValid || loading} className="sg-btn sg-btn-success" style={{ width: '100%', opacity: !phoneValid || loading ? 0.5 : 1 }}>
            {loading ? 'لحظة…' : 'ابعت الكود'}
            {!loading && <ArrowLeft size={20} strokeWidth={1.75} />}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {devCode && (
            <button type="button" onClick={() => verify(devCode)} style={devHint}>
              كود التجربة: <b style={{ letterSpacing: 4, fontSize: 17 }}>{devCode}</b> — اضغط للدخول
            </button>
          )}
          <input
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
              setCode(v);
              if (v.length === 4) verify(v);
            }}
            type="tel"
            inputMode="numeric"
            placeholder="––––"
            style={{ ...inputStyle, textAlign: 'center', letterSpacing: 18, fontSize: 26, fontWeight: 800 }}
            autoFocus
          />
          {error && <div style={errStyle}>{error}</div>}
          <button type="button" onClick={() => verify()} disabled={code.length !== 4 || loading} className="sg-btn sg-btn-success" style={{ width: '100%', opacity: code.length !== 4 || loading ? 0.5 : 1 }}>
            {loading ? 'لحظة واحدة…' : 'دخول'}
            {!loading && <ShieldCheck size={20} strokeWidth={1.75} />}
          </button>
          <button type="button" onClick={() => { setStep('phone'); setError(''); }} style={{ background: 'none', border: 'none', color: '#16A34A', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            غيّر الرقم
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 58,
  borderRadius: 18,
  border: '1.5px solid #E2E8F0',
  background: '#fff',
  padding: '0 18px',
  fontSize: 18,
  fontWeight: 600,
  color: '#0F172A',
  outline: 'none',
  fontFamily: 'inherit',
};
const errStyle: React.CSSProperties = { color: '#DC2626', fontSize: 14, fontWeight: 600, textAlign: 'center' };
const devHint: React.CSSProperties = {
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  borderRadius: 12,
  border: '1px dashed rgba(217,119,6,.5)',
  background: 'rgba(217,119,6,.06)',
  color: '#B45309',
  padding: '8px 16px',
  fontSize: 14,
  cursor: 'pointer',
};
