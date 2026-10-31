import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContent } from '../src/lib/content';
import { Button } from '../src/components/Button';
import { Content } from '../src/components/Content';
import { colors, fonts, space } from '../src/theme';

// Signed-out landing screen: event photos cut along the logo's lapels with
// gold seams (as on the website's home page), then the wordmark and the way in.
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { content } = useContent();
  const heroHeight = Math.round(height * 0.56);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} bounces={false}>
      <LapelHero covers={content?.covers || []} height={heroHeight} />
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

const SKEW = 10; // degrees, matching the lapel angle of the logo

function LapelHero({ covers, height }) {
  const { width } = useWindowDimensions();
  const photos = covers.slice(0, 3);
  const slice = width / Math.max(photos.length, 1);
  // A skewed panel leans by this much at its top and bottom edges.
  const lean = Math.tan((SKEW * Math.PI) / 180) * (height / 2);

  return (
    <View style={[styles.hero, { height }]} accessible={false}>
      {photos.map((uri, i) => (
        <View
          key={uri}
          style={[
            styles.panel,
            {
              left: i * slice - (i === 0 ? lean : 0),
              width: slice + (i === 0 ? lean : 0) + (i === photos.length - 1 ? lean : 0),
              transform: [{ skewX: `-${SKEW}deg` }]
            },
            i > 0 && styles.seam
          ]}
        >
          <Image
            source={{ uri }}
            style={[StyleSheet.absoluteFill, { left: -lean, right: -lean, transform: [{ skewX: `${SKEW}deg` }] }]}
            contentFit="cover"
            transition={300}
          />
        </View>
      ))}
      <View style={styles.fade} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  scroll: { flexGrow: 1 },
  hero: { overflow: 'hidden', backgroundImage: `linear-gradient(180deg, ${colors.slate}, ${colors.navy})` },
  panel: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  seam: { borderLeftWidth: 2, borderLeftColor: colors.gold },
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
