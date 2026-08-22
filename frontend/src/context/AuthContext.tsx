import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  auth, 
  db,
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  firebaseSignOut 
} from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  getIdToken: () => Promise<string | null>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken(true);
  };

  const login = async (email: string, password: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, username: string): Promise<void> => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;

    // Try creating user profile document in Firestore (handle gracefully if Firestore rules need Console update)
    try {
      await setDoc(doc(db, 'users', user.uid), {
        user_id: user.uid,
        username: username || email.split('@')[0],
        email: user.email,
        created_at: serverTimestamp()
      });
    } catch (fsErr) {
      console.warn('Firestore profile creation warning (update Firestore rules in Firebase Console if needed):', fsErr);
    }
  };

  const logout = async (): Promise<void> => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, getIdToken, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
