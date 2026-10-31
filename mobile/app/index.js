import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

// The app launches at "/": members land on Home, everyone else on the
// welcome screen.
export default function Index() {
  const { signedIn } = useAuth();
  return <Redirect href={signedIn ? '/home' : '/welcome'} />;
}
