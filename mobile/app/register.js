import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { api } from '../src/lib/api';
import { useContent } from '../src/lib/content';
import { pickImage } from '../src/lib/pickImage';
import { useAuth } from '../src/context/AuthContext';
import { Button } from '../src/components/Button';
import { Content } from '../src/components/Content';
import { Field, SectionTitle, ToggleRow } from '../src/components/Form';
import { colors, fonts, radius, space } from '../src/theme';

const STEPS = ['About you', 'Staying in touch', 'Reference photo', 'Profile photo', 'Guidelines'];
const HANDLE = /^[a-z0-9_.]{2,30}$/i;

// Joining in the app: the same details, private reference photo and
// agreements as the website's sign-up form (POST /api/register).
export default function Register() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { content } = useContent();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    shareFirstName: true,
    email: '',
    password: '',
    hasInstagram: true,
    instagramHandle: '',
    preferredContactMethod: '',
    phoneNumber: ''
  });
  const [photo, setPhoto] = useState(null); // { uri, ref }
  // Public profile photo: 'reference', 'upload' (avatar) or 'none'.
  const [avatarChoice, setAvatarChoice] = useState(null);
  const [avatar, setAvatar] = useState(null); // { uri, ref }
  const [agreed, setAgreed] = useState({});
  const [noticeAgreed, setNoticeAgreed] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.firstName.trim()) e.firstName = 'Please provide your first name.';
      if (!form.lastName.trim()) e.lastName = 'Please provide your last name.';
      if (!form.shareFirstName && !form.preferredName.trim()) e.preferredName = 'Add the name you’d like members to see.';
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email address.';
      if (form.password.length < 6) e.password = 'Use at least 6 characters.';
    }
    if (step === 1) {
      if (form.hasInstagram && !HANDLE.test(form.instagramHandle.trim().replace(/^@/, ''))) {
        e.instagramHandle = 'Enter your Instagram username.';
      }
      if (!form.hasInstagram && form.preferredContactMethod.trim().length < 3) {
        e.preferredContactMethod = 'Let us know how to reach you.';
      }
      if (form.phoneNumber.trim() && form.phoneNumber.replace(/\D/g, '').length < 7) e.phoneNumber = 'At least 7 digits.';
    }
    if (step === 2 && !photo?.ref) e.photo = 'Please add a reference photo.';
    if (step === 3 && !avatarChoice) e.avatar = 'Choose a profile photo, or tap Not now.';
    if (step === 3 && avatarChoice === 'upload' && !avatar?.ref) e.avatar = 'Add your profile photo, or choose another option.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const choosePhoto = async () => {
    const asset = await pickImage({
      title: 'Reference photo',
      message: 'A clear photo of your face. Only the Manchester Gents team can see it.'
    });
    if (!asset) return;
    setBusy(true);
    try {
      const { url } = await api.uploadReferencePhoto(asset);
      setPhoto({ uri: asset.uri, ref: url });
      setErrors({});
    } catch (e) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  // Uploaded now, parked until the account exists; the server copies it to
  // the new member's public avatar.
  const chooseAvatar = async () => {
    const asset = await pickImage({ title: 'Profile photo', message: 'Shown to other members on your profile and in chats.' });
    if (!asset) return;
    setBusy(true);
    try {
      const { url } = await api.uploadReferencePhoto(asset);
      setAvatar({ uri: asset.uri, ref: url });
      setAvatarChoice('upload');
      setErrors({});
    } catch (e) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const guidelines = content?.guidelines || [];
  const allAgreed = guidelines.length > 0 && guidelines.every((g) => agreed[g.key]) && noticeAgreed;

  const submit = async () => {
    setBusy(true);
    try {
      const handle = form.instagramHandle.trim().replace(/^@/, '').toLowerCase();
      await api.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        preferredName: form.preferredName.trim() || null,
        shareFirstName: form.shareFirstName,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        hasInstagram: form.hasInstagram,
        instagramHandle: form.hasInstagram ? handle : null,
        preferredContactMethod: form.hasInstagram ? null : form.preferredContactMethod.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        profilePhotoUrl: photo.ref,
        profilePhotoOriginalUrl: photo.ref,
        avatarChoice,
        avatarPhotoUrl: avatarChoice === 'upload' ? avatar.ref : null,
        ...Object.fromEntries(guidelines.map((g) => [g.key, true])),
        photoNoticeAgreed: true
      });
    } catch (e) {
      Alert.alert('Couldn’t create your account', e.message);
      setBusy(false);
      return;
    }
    try {
      await signIn(form.email.trim().toLowerCase(), form.password);
    } catch (e) {
      // Test builds only let beta testers sign in.
      Alert.alert('Your account is ready', e.message, [{ text: 'OK', onPress: () => router.back() }]);
      setBusy(false);
    }
  };

  const next = () => {
    if (!validate()) return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit();
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
        <Content style={styles.content}>
          <View style={styles.progress} accessibilityLabel={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
            {STEPS.map((s, i) => (
              <View key={s} style={[styles.progressBar, i <= step && styles.progressDone]} />
            ))}
          </View>
          <Text style={styles.title}>{STEPS[step]}</Text>

          {step === 0 ? (
            <>
              <View style={styles.row}>
                <Field style={styles.flex} label="First name" value={form.firstName} onChangeText={set('firstName')} autoComplete="given-name" textContentType="givenName" error={errors.firstName} />
                <Field style={styles.flex} label="Last name" value={form.lastName} onChangeText={set('lastName')} autoComplete="family-name" textContentType="familyName" error={errors.lastName} />
              </View>
              <ToggleRow
                title="Show my real name"
                description="Members see your first and last name. Turn off to show only a preferred name."
                value={form.shareFirstName}
                onValueChange={set('shareFirstName')}
              />
              <Field label="Preferred name" hint="Optional unless you hide your real name." value={form.preferredName} onChangeText={set('preferredName')} error={errors.preferredName} />
              <Field label="Email" value={form.email} onChangeText={set('email')} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" error={errors.email} />
              <Field label="Password" value={form.password} onChangeText={set('password')} secureTextEntry autoComplete="new-password" textContentType="newPassword" error={errors.password} />
            </>
          ) : step === 1 ? (
            <>
              <ToggleRow
                title="I’m on Instagram"
                description="We use your handle to recognise you. Not on Instagram? Tell us how to reach you instead."
                value={form.hasInstagram}
                onValueChange={set('hasInstagram')}
              />
              {form.hasInstagram ? (
                <Field label="Instagram username" placeholder="@yourhandle" value={form.instagramHandle} onChangeText={set('instagramHandle')} autoCapitalize="none" autoCorrect={false} error={errors.instagramHandle} />
              ) : (
                <Field label="How should we reach you?" placeholder="e.g. WhatsApp on my number below" value={form.preferredContactMethod} onChangeText={set('preferredContactMethod')} error={errors.preferredContactMethod} />
              )}
              <Field label="Phone number" hint="Optional." value={form.phoneNumber} onChangeText={set('phoneNumber')} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" error={errors.phoneNumber} />
            </>
          ) : step === 2 ? (
            <>
              <Text style={styles.text}>
                A clear photo of your face so our hosts can welcome you at the door. It’s private: only the Manchester Gents
                team can see it. Next, you choose a public profile photo.
              </Text>
              <Pressable onPress={choosePhoto} disabled={busy} style={styles.photo} accessibilityRole="button" accessibilityLabel={photo ? 'Change reference photo' : 'Add reference photo'}>
                {photo ? <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                <Text style={[styles.photoLabel, photo && styles.photoLabelOnImage]}>{busy ? 'Uploading…' : photo ? 'Change photo' : 'Add photo'}</Text>
              </Pressable>
              {errors.photo ? <Text style={styles.error}>{errors.photo}</Text> : null}
            </>
          ) : step === 3 ? (
            <>
              <Text style={styles.text}>
                Members see it on your profile and next to your messages. Your reference photo stays private unless you
                choose to use it here. You can change it any time.
              </Text>
              {avatarChoice === 'reference' && photo ? (
                <Image source={{ uri: photo.uri }} style={styles.avatar} contentFit="cover" />
              ) : avatarChoice === 'upload' && avatar ? (
                <Image source={{ uri: avatar.uri }} style={styles.avatar} contentFit="cover" />
              ) : null}
              <View style={styles.choices}>
                <Button
                  title="Use my reference photo"
                  variant={avatarChoice === 'reference' ? 'primary' : 'secondary'}
                  onPress={() => {
                    setAvatarChoice('reference');
                    setErrors({});
                  }}
                  disabled={busy}
                />
                <Button
                  title={avatarChoice === 'upload' && avatar ? 'Choose another photo' : 'Upload a different photo'}
                  variant={avatarChoice === 'upload' ? 'primary' : 'secondary'}
                  onPress={chooseAvatar}
                  loading={busy}
                  disabled={busy}
                />
                <Button
                  title="Not now"
                  variant={avatarChoice === 'none' ? 'primary' : 'ghost'}
                  onPress={() => {
                    setAvatarChoice('none');
                    setErrors({});
                  }}
                  disabled={busy}
                />
              </View>
              {errors.avatar ? <Text style={styles.error}>{errors.avatar}</Text> : null}
            </>
          ) : (
            <>
              <Text style={styles.text}>Please read and agree to each of these. They’re what keeps our socials safe and welcoming.</Text>
              {guidelines.map((g) => (
                <ToggleRow
                  key={g.key}
                  title={g.title}
                  description={g.description}
                  value={Boolean(agreed[g.key])}
                  onValueChange={(v) => setAgreed((a) => ({ ...a, [g.key]: v }))}
                />
              ))}
              {content ? (
                <>
                  <SectionTitle>{content.photographyNotice.title}</SectionTitle>
                  {content.photographyNotice.paragraphs.map((p) => (
                    <Text key={p} style={styles.small}>
                      {p}
                    </Text>
                  ))}
                  <ToggleRow title="I understand" value={noticeAgreed} onValueChange={setNoticeAgreed} />
                </>
              ) : null}
              <Text style={styles.small}>
                By joining you agree to our{' '}
                <Text style={styles.link} onPress={() => router.push('/info/privacy')}>
                  privacy policy
                </Text>
                .
              </Text>
            </>
          )}

          <View style={styles.actions}>
            <Button
              title={step === STEPS.length - 1 ? 'Join Manchester Gents' : 'Continue'}
              onPress={next}
              loading={busy && step === STEPS.length - 1}
              disabled={(step === STEPS.length - 1 && !allAgreed) || (busy && (step === 2 || step === 3))}
            />
            {step > 0 ? <Button title="Back" variant="ghost" onPress={() => setStep(step - 1)} /> : null}
          </View>
        </Content>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },
  progress: { flexDirection: 'row', gap: space.xs },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.card },
  progressDone: { backgroundColor: colors.gold },
  title: { color: colors.gold, fontFamily: fonts.heading, fontSize: 34 },
  row: { flexDirection: 'row', gap: space.md },
  text: { color: colors.text, fontSize: 16, lineHeight: 23 },
  small: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  link: { color: colors.gold, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 14 },
  photo: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: space.md
  },
  photoLabel: { color: colors.gold, fontWeight: '600', fontSize: 15, marginBottom: 72 },
  photoLabelOnImage: { marginBottom: 0, backgroundColor: 'rgba(20, 29, 41, 0.7)', paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, overflow: 'hidden' },
  avatar: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center', borderWidth: 2, borderColor: colors.gold },
  choices: { gap: space.md },
  actions: { gap: space.sm, marginTop: space.md }
});
