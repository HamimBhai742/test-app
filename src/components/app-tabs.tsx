import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

// এটি আমাদের অ্যাপ্লিকেশনের মোবাইল ভার্সনের জন্য নেভিগেশন ট্যাব বার ডিফাইন করে।
// NativeTabs আমাদের ডিভাইসের নেটিভ বটম ট্যাব বার ব্যবহার করার সুযোগ দেয়।
export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      
      {/* প্রথম ট্যাব: ড্যাশবোর্ড (Home/Dashboard) */}
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {/* দ্বিতীয় ট্যাব: লেনদেনের ইতিহাস (Transactions History) */}
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {/* তৃতীয় ট্যাব: ব্যয় সংক্রান্ত পরিসংখ্যান (Analytics/Stats) */}
      {/* নোট: orders.png ফাইলটি এসেট ফোল্ডারে অনুপস্থিত ছিল, তাই ক্র্যাশ এড়াতে explore.png ব্যবহার করা হয়েছে। */}
      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label>Stats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

