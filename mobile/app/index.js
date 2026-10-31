import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

// The app launches at "/": send members to Events and everyone else to sign-in.
export default function Index() {
  const { signedIn } = useAuth();
  return <Redirect href={signedIn ? '/events' : '/sign-in'} />;
}
