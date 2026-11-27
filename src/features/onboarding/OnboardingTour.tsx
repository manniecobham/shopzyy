import { useRef, useState, type ReactNode } from 'react';
import { FlatList, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { ProminentButton, TextButton } from '../../components/ui';
import { useTheme } from '../../theme/theme';
import { t as tr } from '../../i18n';
import { AddScene, RemindScene, ScanScene, ShareScene, TipsScene, TripScene } from './Illustrations';

interface Page { key: string; render: (active: boolean) => ReactNode; title?: string; body?: string }

// `hero` is the welcome page shown before the feature pages on a first launch.
// `skippable` is off when the tour sits in a sheet that already has its own Done button.
export function OnboardingTour({ hero, onDone, doneTitle, skippable = true }: { hero?: ReactNode; onDone: () => void; doneTitle?: string; skippable?: boolean }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<Page>>(null);
  const [index, setIndex] = useState(0);

  const pages: Page[] = [
    ...(hero ? [{ key: 'hero', render: () => hero }] : []),
    { key: 'share', render: (a) => <ShareScene active={a} />, title: tr('One list for the whole household'), body: tr('Everyone you invite sees the same list as it changes. Anyone can add items or tick them off.') },
    { key: 'add', render: (a) => <AddScene active={a} />, title: tr('Add items in one sentence'), body: tr('Type or paste something like “2 kg rice, milk x2, eggs” and Shopzyy turns it into items with quantities.') },
    { key: 'scan', render: (a) => <ScanScene active={a} />, title: tr('Scan your receipt'), body: tr('Photograph a receipt to tick off what you bought and save the total. It is read on your phone, and the photo is never stored.') },
    { key: 'remind', render: (a) => <RemindScene active={a} />, title: tr('Never run out'), body: tr('Shopzyy learns what you buy and reminds everyone before something runs low.') },
    { key: 'trip', render: (a) => <TripScene active={a} />, title: tr('Know when someone has shopped'), body: tr('Get a quick alert when a trip ends, with the items and the total.') },
    { key: 'tips', render: (a) => <TipsScene active={a} />, title: tr('A few more things'), body: tr('Small things that save you time.') },
  ];
  const last = index === pages.length - 1;

  const go = (next: number) => {
    list.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={{ flex: 1 }}>
      {skippable ? (
        <View style={s.top}>
          {!last ? <TextButton title={tr('Skip')} onPress={onDone} /> : null}
        </View>
      ) : null}
      <FlatList
        ref={list} data={pages} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.key} extraData={index} onMomentumScrollEnd={settle}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) => (
          <View style={{ width }}>
            {item.title ? (
              <View style={s.page}>
                {item.render(i === index)}
                <Text style={[s.title, { color: t.label }]}>{item.title}</Text>
                <Text style={[s.body, { color: t.secondaryLabel }]}>{item.body}</Text>
              </View>
            ) : item.render(i === index)}
          </View>
        )}
      />
      <View style={s.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {pages.map((p, i) => (
          <View key={p.key} style={[s.dot, { backgroundColor: i === index ? t.accent : t.tertiaryLabel, width: i === index ? 22 : 8 }]} />
        ))}
      </View>
      <View style={s.footer}>
        <ProminentButton title={last ? (doneTitle ?? tr('Get started')) : tr('Next')} onPress={() => (last ? onDone() : go(index + 1))} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  top: { height: 40, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 20 },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 28 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  body: { fontSize: 17, textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 14 },
  dot: { height: 8, borderRadius: 4 },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
});
