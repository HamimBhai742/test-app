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
      labelVisibilityMode="labeled"
      labelStyle={{
        default: { color: colors.textSecondary, fontSize: 12 },
        selected: { color: colors.text, fontSize: 12, fontWeight: '700' }
      }}>
      
      {/* প্রথম ট্যাব: ড্যাশবোর্ড (Home/Dashboard) */}
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          sf={{ default: 'house', selected: 'house.fill' }}
          md="home"
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {/* দ্বিতীয় ট্যাব: বাজেট পরিকল্পনা (Budget Planner) */}
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Budget</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          sf={{ default: 'wallet.pass', selected: 'wallet.pass.fill' }}
          md="account_balance_wallet"
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {/* তৃতীয় ট্যাব: ব্যয় সংক্রান্ত পরিসংখ্যান (Analytics/Stats) */}
      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label>Stats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
          md="bar_chart"
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {/* চতুর্থ ট্যাব: মাসিক রিপোর্ট (Monthly Report) */}
      <NativeTabs.Trigger name="report">
        <NativeTabs.Trigger.Label>Report</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          sf={{ default: 'calendar', selected: 'calendar.badge.checkmark' }}
          md="calendar_month"
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {/* পঞ্চম ট্যাব: প্রোফাইল (Profile) */}
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          sf={{ default: 'person', selected: 'person.fill' }}
          md="person"
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

