import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';

import { AppProvider, useApp } from './src/store/AppStore';
import { C, F } from './src/theme';
import { Toast } from './src/components/ui';
import { SplashScreen, OnboardingScreen, LoginScreen, PermissionsScreen } from './src/screens/common/CommonScreens';
import { PassengerHome, SearchDestination, CargoForm, TripSummary } from './src/screens/passenger/RequestScreens';
import { TripFlow, TripFinished } from './src/screens/passenger/TripScreens';
import { RewardsScreen, HistoryScreen, TripDetail, ProfileScreen, HelpScreen } from './src/screens/passenger/AccountScreens';
import { PaymentsScreen } from './src/screens/passenger/WalletScreens';
import { DriverRegister, DriverStatus } from './src/screens/driver/DriverOnboarding';
import { DriverHome, IncomingRequestModal, DriverTrip, DriverWallet, WithdrawScreen, EarningsScreen, BonusesScreen, DriverProfile } from './src/screens/driver/DriverScreens';
import { AdminScreen } from './src/screens/admin/AdminScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tabOptions = (icons) => ({ route }) => ({
  headerShown: false,
  tabBarActiveTintColor: C.navy,
  tabBarInactiveTintColor: C.muted,
  tabBarLabelStyle: { fontSize: 12, fontFamily: F.black },
  tabBarStyle: { height: 66, paddingTop: 6, paddingBottom: 8, borderTopColor: C.mapBg },
  tabBarIcon: ({ color, focused }) => <Ionicons name={icons[route.name] + (focused ? '' : '-outline')} size={23} color={color} />,
});

function PassengerTabs() {
  const icons = { Home: 'map', Payments: 'receipt', Rewards: 'gift', History: 'time', Profile: 'person' };
  return (
    <Tab.Navigator screenOptions={tabOptions(icons)}>
      <Tab.Screen name="Home" component={PassengerHome} options={{ title: 'Viajar' }} />
      <Tab.Screen name="Payments" component={PaymentsScreen} options={{ title: 'Pagos' }} />
      <Tab.Screen name="Rewards" component={RewardsScreen} options={{ title: 'Premios' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'Viajes' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

function DriverTabs() {
  const icons = { DriverHome: 'speedometer', Earnings: 'stats-chart', Wallet: 'wallet', Bonuses: 'trophy', DriverProfile: 'person' };
  return (
    <Tab.Navigator screenOptions={tabOptions(icons)}>
      <Tab.Screen name="DriverHome" component={DriverHome} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Earnings" component={EarningsScreen} options={{ title: 'Ganancias' }} />
      <Tab.Screen name="Wallet" component={DriverWallet} options={{ title: 'Billetera' }} />
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
          <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Permissions" component={PermissionsScreen} />
          <Stack.Screen name="PassengerTabs" component={PassengerTabs} options={{ animation: 'fade' }} />
          <Stack.Screen name="SearchDestination" component={SearchDestination} options={{ animation: 'slide_from_bottom' }} />
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
          <Stack.Screen name="Withdraw" component={WithdrawScreen} options={{ animation: 'slide_from_bottom' }} />
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
  const [fontsLoaded] = useFonts({
    Poppins_700Bold, Poppins_800ExtraBold, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold,
  });
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.gold} />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
