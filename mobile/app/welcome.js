import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContent } from '../src/lib/content';
import { Button } from '../src/components/Button';
import { Content } from '../src/components/Content';
import { colors, fonts, space } from '../src/theme';

// Signed-out landing screen: the website's hero photo (chosen by admins in
// admin mode, cropped around its focus point, with its caption), then the
// wordmark and the way in.
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { content } = useContent();
  const heroHeight = Math.round(height * 0.56);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} bounces={false}>
      <Hero hero={content?.hero} height={heroHeight} />
      <Content style={[styles.content, { paddingBottom: insets.bottom + space.xl }]}>
        <Image source={require('../assets/images/splash-icon.png')} style={styles.logo} contentFit="contain" />
        <Text style={styles.wordmark}>Manchester Gents</Text>
        <Text style={styles.tagline}>Suited socials, good drinks, easy conversation.</Text>
        <View style={styles.actions}>
          <Button title="Join the club" onPress={() => router.push('/register')} />
          <Button title="Sign in" variant="secondary" onPress={() => router.push('/sign-in')} />
        </View>
        <View style={styles.links}>
          <Text style={styles.link} onPress={() => router.push('/info/guidelines')} accessibilityRole="link">
            Community guidelines
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.link} onPress={() => router.push('/info/privacy')} accessibilityRole="link">
            Privacy
          </Text>
        </View>
      </Content>
    </ScrollView>
  );
}

function Hero({ hero, height }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, { height }]} accessible={false}>
      {hero?.src ? (
        <Image
          source={{ uri: hero.src }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={hero.focus ? { left: `${hero.focus.x}%`, top: `${hero.focus.y}%` } : 'center'}
          transition={300}
        />
      ) : null}
      <View style={styles.fade} />
      {hero?.caption ? (
        <View style={[styles.captionWrap, { top: insets.top + space.md }]}>
          <Text style={styles.caption}>{hero.caption}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  scroll: { flexGrow: 1 },
  hero: { overflow: 'hidden', backgroundImage: `linear-gradient(180deg, ${colors.slate}, ${colors.navy})` },
  captionWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  caption: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(28, 40, 55, 0.55)'
  },
  fade: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage: `linear-gradient(180deg, rgba(28, 40, 55, 0.05) 45%, ${colors.navy} 100%)`
  },
  content: { alignItems: 'center', paddingHorizontal: space.xl, marginTop: -72, gap: space.sm },
  logo: { width: 96, height: 96 },
  wordmark: { color: colors.gold, fontFamily: fonts.heading, fontSize: 44, textAlign: 'center' },
  tagline: { color: colors.textMuted, fontSize: 17, textAlign: 'center' },
  actions: { width: '100%', maxWidth: 440, gap: space.md, marginTop: space.xl },
  links: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
  link: { color: colors.textMuted, fontSize: 14, textDecorationLine: 'underline' },
  dot: { color: colors.textFaint, fontSize: 14 }
});
