import React, { useState, useEffect } from 'react';
import { DevUser } from '../types';
import { Shield, Terminal, Code, LogIn, UserPlus, Mail, Lock, AlertCircle } from 'lucide-react';
import { 
  auth, 
  db, 
  googleProvider,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  doc, 
  getDoc, 
  setDoc,
  User,
  handleFirestoreError,
  OperationType
} from '../firebase';

interface ProfileSelectorProps {
  onSelect: (user: DevUser) => void;
  onBackToLanding?: () => void;
}

const EMOJIS = ['⚛️', '🦀', '🚀', '🤖', '👾', '🐍', '☕', '🧠', '⚙️', '💻'];
const SKILLS = ['TS', 'React', 'Node', 'Rust', 'Docker', 'Python', 'PostgreSQL', 'Tailwind', 'K8s', 'Git'];

export default function ProfileSelector({ onSelect, onBackToLanding }: ProfileSelectorProps) {
  // Firebase Auth and Profile States
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form Inputs for Auth
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Form Inputs for Profile Onboarding (Custom Identity)
  const [customUser, setCustomUser] = useState<string>('');
  const [customRole, setCustomRole] = useState<string>('Full-Stack Engineer');
  const [customAvatar, setCustomAvatar] = useState<string>('👾');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['TS', 'React']);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);
      setError(null);
      
      if (user) {
        // Fetch profile from Firestore
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const profileData = userDoc.data() as DevUser;
            // Pre-save to local storage and log in
            onSelect(profileData);
          } else {
            // Document doesn't exist, trigger onboarding
            setShowOnboarding(true);
            
            // Pre-populate username if possible
            if (user.displayName) {
              setCustomUser(user.displayName.toLowerCase().replace(/\s+/g, '_').substring(0, 18));
            } else if (user.email) {
              setCustomUser(user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 18));
            }
          }
        } catch (err: any) {
          console.error("Error fetching user profile:", err);
          setError("Failed to fetch user profile: " + err.message);
          if (err.code === 'permission-denied') {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}`, user);
          }
        }
      } else {
        setShowOnboarding(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [onSelect]);

  // Handle standard Email & Password login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setActionLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Login Error:", err);
      let friendlyMessage = err.message;
      if (err.code === 'auth/invalid-credential') {
        friendlyMessage = "Incorrect email or password. Please verify your credentials.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = "Please enter a valid email address.";
      }
      setError(friendlyMessage);
      setActionLoading(false);
    }
  };

  // Handle standard Email & Password registration
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Registration Error:", err);
      let friendlyMessage = err.message;
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = "This email is already in use by another node.";
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = "Weak password. Please use at least 6 characters.";
      }
      setError(friendlyMessage);
      setActionLoading(false);
    }
  };

  // Handle Google OAuth Pop-up sign-in
  const handleGoogleLogin = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError("Google authentication failed: " + err.message);
      }
      setActionLoading(false);
    }
  };

  // Handle creating custom Firestore profile document
  const handleCreateCustomProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser) return;
    if (!customUser.trim()) {
      setError("Terminal handle is required.");
      return;
    }

    setActionLoading(true);
    setError(null);

    const cleanUsername = customUser.trim().toLowerCase().replace(/\s+/g, '_');
    
    const newProfile: DevUser = {
      id: fbUser.uid,
      username: cleanUsername,
      role: customRole,
      avatarEmoji: customAvatar,
      skills: selectedSkills,
      status: 'online',
      streakCount: 1,
      xpPoints: 15
    };

    try {
      // Save profile to firestore
      await setDoc(doc(db, 'users', fbUser.uid), newProfile);
      
      // Trigger callback to select and launch app
      onSelect(newProfile);
    } catch (err: any) {
      console.error("Error creating profile:", err);
      setError("Could not write profile to database: " + err.message);
      setActionLoading(false);
      if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`, fbUser);
      }
    }
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      if (selectedSkills.length < 5) {
        setSelectedSkills([...selectedSkills, skill]);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08060f] text-gray-100 flex flex-col items-center justify-center p-6 font-mono">
        <div className="text-center space-y-4">
          <Terminal size={40} className="text-cyan-400 animate-pulse mx-auto" />
          <p className="text-xs text-purple-300/60 uppercase tracking-widest">establishing_secure_satellite_uplink.sh</p>
          <div className="w-48 h-1.5 bg-purple-950/40 border border-purple-500/20 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full animate-[loading_1.5s_infinite_ease-in-out]" style={{ width: '40%' }} />
          </div>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08060f] text-gray-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {onBackToLanding && (
        <button
          type="button"
          onClick={onBackToLanding}
          className="absolute top-8 left-12 text-xs font-mono tracking-widest text-purple-300 hover:text-cyan-400 flex items-center gap-2 transition-all cursor-pointer z-50 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span>BACK_TO_LANDING_LOG</span>
        </button>
      )}

      {/* Nebula Mesh Gradient Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />

      {/* Cyberpunk grid lines overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,rgba(6,182,212,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(124,58,237,0.08)_1px,transparent_1px)] bg-[size:45px_45px]" />
      
      {/* Node Status Indicator */}
      <div className="absolute top-8 right-12 text-[10px] font-mono tracking-widest text-cyan-400/60 uppercase select-none hidden md:flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
        <span>NODE_STATUS // NEBULA_SECURE_AUTH</span>
      </div>

      <div className="w-full max-w-lg bg-[#110d24]/85 border border-purple-500/30 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(124,58,237,0.15)] overflow-hidden relative z-10">
        {/* Colorful top strip */}
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 w-full" />

        {/* Terminal Header */}
        <div className="bg-[#161230]/90 px-6 py-4 flex items-center justify-between border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
            <span className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(124,58,237,0.6)]" />
            <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
          </div>
          <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-widest uppercase">
            {showOnboarding ? 'establish_identity_node.sh' : 'authenticate_uplink_terminal.sh'}
          </span>
          <div className="w-12" />
        </div>

        {/* Card Body */}
        <div className="p-8 sm:p-10">
          {/* Header text */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3.5 bg-purple-950/40 rounded-xl border border-purple-500/30 text-cyan-400 mb-3.5 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Terminal size={24} className="animate-pulse" />
            </div>
            <h1 className="text-2xl font-serif font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-cyan-200 tracking-tight mb-2">
              {showOnboarding ? 'Create Developer Identity' : 'DevPulse Central Uplink'}
            </h1>
            <p className="text-xs font-sans text-purple-200/65 max-w-sm mx-auto leading-relaxed">
              {showOnboarding 
                ? 'Specify your handle and index of professional tags to publish to the global decentralized active registry.' 
                : 'Connect your secure Google node or private credentials to unlock workspace operations.'
              }
            </p>
          </div>

          {/* Show error alerts */}
          {error && (
            <div className="mb-6 p-3.5 bg-pink-950/40 border border-pink-500/35 rounded-xl text-pink-200 text-xs flex items-start gap-2.5 font-mono">
              <AlertCircle size={14} className="text-pink-400 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Render Onboarding Wizard */}
          {showOnboarding ? (
            <form onSubmit={handleCreateCustomProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-purple-300/80 mb-2 uppercase font-mono">Uplink handle</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-pink-500 font-mono font-bold">@</span>
                    <input
                      type="text"
                      maxLength={18}
                      required
                      placeholder="code_ninja"
                      value={customUser}
                      onChange={(e) => setCustomUser(e.target.value)}
                      className="w-full bg-[#141029]/60 border border-purple-500/30 focus:border-cyan-400 rounded-lg pl-8 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-all font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-purple-300/80 mb-2 uppercase font-mono">Assigned role</label>
                  <input
                    type="text"
                    required
                    placeholder="Staff Tech Lead"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="w-full bg-[#141029]/60 border border-purple-500/30 focus:border-cyan-400 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-all"
                  />
                </div>
              </div>

              {/* Avatar Emoji */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-purple-300/80 mb-2 uppercase font-mono font-bold">Identity badge (avatar)</label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 p-2.5 bg-[#141029]/40 border border-purple-500/20 rounded-xl">
                  {EMOJIS.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setCustomAvatar(emoji)}
                      className={`text-xl p-1.5 rounded-lg transition-all hover:bg-purple-900/30 ${
                        customAvatar === emoji 
                          ? 'bg-purple-800/40 border border-purple-500 text-white font-bold' 
                          : 'border border-transparent'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills Index */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-purple-300/80 mb-2 uppercase font-mono">
                  Skill index (Choose 2 - 5)
                </label>
                <div className="flex flex-wrap gap-1.5 p-3.5 bg-[#141029]/40 border border-purple-500/20 rounded-xl">
                  {SKILLS.map((skill) => {
                    const selected = selectedSkills.includes(skill);
                    return (
                      <button
                        type="button"
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`text-xs font-mono px-3 py-1 border transition-all rounded-lg ${
                          selected
                            ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                            : 'bg-[#1b163a]/50 text-purple-300 border-purple-500/20 hover:border-purple-500/60 hover:text-white'
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading || selectedSkills.length < 2 || !customUser.trim()}
                className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-500 disabled:opacity-45 text-white font-mono font-bold text-xs tracking-wider uppercase py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5 mt-3 shadow-[0_0_20px_rgba(124,58,237,0.3)] border border-purple-400/30 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <Code size={15} />
                {actionLoading ? 'DEPLOYING IDENTITIES...' : 'ESTABLISH DEVPULSE IDENTITY'}
              </button>
            </form>
          ) : (
            /* Auth Login / Register Forms */
            <div className="space-y-6">
              {/* Auth Tab Switching */}
              <div className="flex border border-purple-500/30 p-1 bg-[#161230]/60 rounded-xl">
                <button
                  onClick={() => { setAuthMode('login'); setError(null); }}
                  className={`flex-1 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 rounded-lg flex items-center justify-center gap-1.5 ${
                    authMode === 'login'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/25 border border-purple-500/30'
                      : 'border border-transparent text-purple-300/50 hover:text-purple-200'
                  }`}
                >
                  <LogIn size={12} />
                  Access Gateway
                </button>
                <button
                  onClick={() => { setAuthMode('register'); setError(null); }}
                  className={`flex-1 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 rounded-lg flex items-center justify-center gap-1.5 ${
                    authMode === 'register'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/25 border border-purple-500/30'
                      : 'border border-transparent text-purple-300/50 hover:text-purple-200'
                  }`}
                >
                  <UserPlus size={12} />
                  Provision Node
                </button>
              </div>

              {/* Auth Credentials Form */}
              <form onSubmit={authMode === 'login' ? handleEmailLogin : handleEmailRegister} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold tracking-widest text-purple-300/60 mb-1.5 uppercase font-mono">E-mail node address</label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3.5 top-3 text-purple-400/60" />
                    <input
                      type="email"
                      required
                      placeholder="address@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#141029]/60 border border-purple-500/25 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/40 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold tracking-widest text-purple-300/60 mb-1.5 uppercase font-mono">Satellite secret key</label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3.5 top-3 text-purple-400/60" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#141029]/60 border border-purple-500/25 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/40 transition-all font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-[#1b163a] hover:bg-purple-900/40 border border-purple-500/45 text-white font-mono font-bold text-xs tracking-wider uppercase py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(124,58,237,0.1)] hover:border-cyan-400 cursor-pointer"
                >
                  {authMode === 'login' ? <LogIn size={13} /> : <UserPlus size={13} />}
                  {actionLoading 
                    ? 'CONNECTING CORE...' 
                    : authMode === 'login' 
                      ? 'Establish Uplink' 
                      : 'Provision New Space'
                  }
                </button>
              </form>

              {/* Divider lines */}
              <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-purple-400/30 uppercase my-4">
                <div className="h-[1px] bg-purple-500/20 flex-1" />
                <span className="px-3">or authorize via</span>
                <div className="h-[1px] bg-purple-500/20 flex-1" />
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={actionLoading}
                className="w-full bg-white hover:bg-gray-100 text-black font-mono font-bold text-xs py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                {/* Embedded clean Google Icon */}
                <svg width="15" height="15" viewBox="0 0 48 48" className="inline-block flex-shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.5 24c0-1.63-.15-3.21-.42-4.75H24v9h12.75c-.55 2.87-2.17 5.31-4.6 6.94l7.19 5.57C43.53 36.63 46.5 30.9 46.5 24z"/>
                  <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.19-5.57c-1.99 1.34-4.55 2.13-7.7 2.13-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Sign in with Google Node
              </button>
            </div>
          )}

          {/* Secure pipeline signature footer */}
          <div className="flex items-center justify-center gap-2 mt-8 text-[9px] font-mono tracking-wider text-purple-400/40 uppercase">
            <Shield size={11} className="text-cyan-400" />
            <span>SECURE CRYPTO CHANNEL // ENCRYPTED GATEWAY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
