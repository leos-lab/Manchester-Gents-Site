import { Alert, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { api } from '../../../src/lib/api';
import { useLoader } from '../../../src/lib/useLoader';
import { Content } from '../../../src/components/Content';
import { ToggleRow } from '../../../src/components/Form';
import { ListGroup, ListRow } from '../../../src/components/ListGroup';
import { colors, space } from '../../../src/theme';

// Site-wide switches from the website's Admin → Security page.
export default function AdminSettings() {
  const { data, refreshing, refresh, reload } = useLoader(() => api.admin.settings());

  const change = async (fn) => {
    try {
      await fn();
      await reload();
    } catch (e) {
      Alert.alert('Couldn’t save', e.message);
    }
  };

  const signEveryoneOut = () =>
    Alert.alert(
      'Log everyone out?',
      'Every member is signed out of the website and the app, including you. Use this if an account may have been compromised.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log everyone out', style: 'destructive', onPress: () => change(() => api.admin.signEveryoneOut()) }
      ]
    );

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
    >
      <Content style={styles.content}>
        {data ? (
          <>
            <ListGroup
              title="Photography notice"
              footer="When on, members accept the photography notice before they can RSVP, on the website and in the app."
            >
              <ToggleRow
                title="Ask members to accept it"
                value={data.photoNotice.enabled}
                onValueChange={(v) => change(() => api.admin.setPhotoNotice(v))}
              />
            </ListGroup>
            <ListGroup
              title="Coming soon page"
              footer={
                data.comingSoon.disableAt
                  ? `Switches off automatically on ${new Date(data.comingSoon.disableAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.`
                  : 'Shows the coming-soon page to visitors of the website. Admins still see the full site.'
              }
            >
              <ToggleRow
                title="Show coming soon page"
                value={data.comingSoon.enabled}
                onValueChange={(v) => change(() => api.admin.setComingSoon(v, data.comingSoon.disableAt))}
              />
            </ListGroup>
          </>
        ) : null}
        <ListGroup title="Sessions">
          <ListRow title="Log everyone out" destructive chevron={false} onPress={signEveryoneOut} />
        </ListGroup>
      </Content>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.lg, gap: space.xl, paddingBottom: 140 }
});
