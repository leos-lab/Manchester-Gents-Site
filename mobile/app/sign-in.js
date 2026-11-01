import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAuth } from '../src/context/AuthContext';
import { Button } from '../src/components/Button';
import { Content } from '../src/components/Content';
import { colors, fonts, radius, space } from '../src/theme';
import { useKeyboardDone } from '../src/components/KeyboardDone';

export default function SignIn() {
  const keyboard = useKeyboardDone();
  const router = useRouter();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!identifier.trim() || !password) {
      setError('Enter your email or Instagram handle and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(identifier, password);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Content style={styles.content}>
          <Image source={require('../assets/images/splash-icon.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.title}>Manchester Gents</Text>
          <Text style={styles.subtitle}>Suited socials, good drinks, easy conversation.</Text>

          <View style={styles.form}>
            <TextInput
              {...keyboard.inputProps}
              style={styles.input}
              placeholder="Email or Instagram handle"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              keyboardType="email-address"
              value={identifier}
              onChangeText={setIdentifier}
              returnKeyType="next"
            />
            {keyboard.bar}
            <TextInput
              {...keyboard.inputProps}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
            <Button title="Sign in" onPress={submit} loading={busy} />
            <Button title="Forgot password?" variant="ghost" onPress={() => router.push('/forgot-password')} />
          </View>

          <Text style={styles.footer}>
            New here?{' '}
            <Text style={styles.link} onPress={() => router.replace('/register')} accessibilityRole="link">
              Join the club
            </Text>
          </Text>
        </Content>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.navy },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.xl },
  content: { maxWidth: 440, alignItems: 'stretch' },
  logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: space.lg },
  title: { color: colors.gold, fontFamily: fonts.heading, fontSize: 42, textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontSize: 16, textAlign: 'center', marginTop: space.sm },
  form: { marginTop: space.xxl, gap: space.md },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: space.lg,
    paddingVertical: 15
  },
  error: { color: colors.danger, fontSize: 15, textAlign: 'center' },
  footer: { color: colors.textMuted, textAlign: 'center', marginTop: space.xxl, fontSize: 15 },
  link: { color: colors.gold, fontWeight: '600' }
});
