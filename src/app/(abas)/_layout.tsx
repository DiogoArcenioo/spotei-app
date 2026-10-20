import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { cores } from "@/utils/tema";
export default function Abas() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.destaque,
        tabBarInactiveTintColor: cores.secundario,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: cores.fundo,
          borderTopColor: cores.borda,
          borderTopWidth: 1,
          minHeight: 64,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, marginTop: 3, fontWeight: "600" },
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Início",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={25}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="publicar"
        options={{
          title: "Novo spot",
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="explorar"
        options={{ title: "Explorar", href: null }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: "Ranking",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "trophy" : "trophy-outline"}
              color={color}
              size={25}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={color}
              size={25}
            />
          ),
        }}
      />
    </Tabs>
  );
}
