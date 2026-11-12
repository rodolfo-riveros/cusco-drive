import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppProvider, useApp } from './src/store/AppStore';
import { C } from './src/theme';
import { Toast } from './src/components/ui';
import { SplashScreen, OnboardingScreen, RoleSelectScreen, LoginScreen, PermissionsScreen } from './src/screens/common/CommonScreens';
import { PassengerHome, SearchDestination, PickOnMap, CargoForm, TripSummary } from './src/screens/passenger/RequestScreens';
import { TripFlow, TripFinished } from './src/screens/passenger/TripScreens';
import { RewardsScreen, HistoryScreen, TripDetail, ProfileScreen, HelpScreen } from './src/screens/passenger/AccountScreens';
import { DriverRegister, DriverStatus } from './src/screens/driver/DriverOnboarding';
import { DriverHome, IncomingRequestModal, DriverTrip, WalletScreen, RechargeScreen, EarningsScreen, BonusesScreen, DriverProfile } from './src/screens/driver/DriverScreens';
import { AdminScreen } from './src/screens/admin/AdminScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tabOptions = (icons, activeColor) => ({ route }) => ({
  headerShown: false,
  tabBarActiveTintColor: activeColor,
  tabBarInactiveTintColor: C.muted,
  tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
  tabBarStyle: { height: 64, paddingTop: 6 },
  tabBarIcon: ({ color, focused }) => <Ionicons name={icons[route.name] + (focused ? '' : '-outline')} size={24} color={color} />,
});

function PassengerTabs() {
  const icons = { Home: 'map', Rewards: 'gift', History: 'time', Profile: 'person' };
  return (
    <Tab.Navigator screenOptions={tabOptions(icons, C.navy)}>
      <Tab.Screen name="Home" component={PassengerHome} options={{ title: 'Viajar' }} />
      <Tab.Screen name="Rewards" component={RewardsScreen} options={{ title: 'Premios' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'Viajes' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

function DriverTabs() {
  const icons = { DriverHome: 'speedometer', Wallet: 'wallet', Earnings: 'stats-chart', Bonuses: 'trophy', DriverProfile: 'person' };
  return (
    <Tab.Navigator screenOptions={tabOptions(icons, C.green)}>
      <Tab.Screen name="DriverHome" component={DriverHome} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: 'Saldo' }} />
      <Tab.Screen name="Earnings" component={EarningsScreen} options={{ title: 'Ganancias' }} />
      <Tab.Screen name="Bonuses" component={BonusesScreen} options={{ title: 'Bonos' }} />
      <Tab.Screen name="DriverProfile" component={DriverProfile} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, primary: C.navy } };

function Root() {
  const { state } = useApp();
  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer theme={theme}>
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Permissions" component={PermissionsScreen} />
          <Stack.Screen name="PassengerTabs" component={PassengerTabs} options={{ animation: 'fade' }} />
          <Stack.Screen name="SearchDestination" component={SearchDestination} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="PickOnMap" component={PickOnMap} />
          <Stack.Screen name="CargoForm" component={CargoForm} />
          <Stack.Screen name="TripSummary" component={TripSummary} />
          <Stack.Screen name="TripFlow" component={TripFlow} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="TripFinished" component={TripFinished} options={{ gestureEnabled: false }} />
          <Stack.Screen name="TripDetail" component={TripDetail} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="DriverRegister" component={DriverRegister} />
          <Stack.Screen name="DriverStatus" component={DriverStatus} />
          <Stack.Screen name="DriverTabs" component={DriverTabs} options={{ animation: 'fade' }} />
          <Stack.Screen name="DriverTrip" component={DriverTrip} options={{ gestureEnabled: false }} />
          <Stack.Screen name="Recharge" component={RechargeScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
        </Stack.Navigator>
        <IncomingRequestModal />
      </NavigationContainer>
      <Toast toast={state.toast} />
      <StatusBar style="dark" />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
