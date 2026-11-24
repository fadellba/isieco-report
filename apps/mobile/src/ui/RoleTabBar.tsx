import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type RoleTabIconName = 'home' | 'list' | 'map' | 'profile';

export interface RoleTabItem {
  route: string;
  label: string;
  icon: RoleTabIconName;
  onPress?: () => void;
}

interface RoleTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string }>;
  };
  navigation: {
    navigate: (name: string) => void;
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
  };
  items: RoleTabItem[];
  action?: {
    label: string;
    onPress: () => void;
  };
}

function TabIcon({ name, color }: { name: RoleTabIconName; color: string }) {
  if (name === 'home') {
    return (
      <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            position: 'absolute',
            top: 2,
            left: 5,
            width: 11,
            height: 11,
            borderTopWidth: 2,
            borderLeftWidth: 2,
            borderColor: color,
            borderTopLeftRadius: 2,
            transform: [{ rotate: '45deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 2,
            left: 5,
            width: 12,
            height: 10,
            borderWidth: 2,
            borderTopWidth: 0,
            borderColor: color,
            borderBottomLeftRadius: 2,
            borderBottomRightRadius: 2,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 2,
            width: 3,
            height: 6,
            backgroundColor: color,
            borderTopLeftRadius: 2,
            borderTopRightRadius: 2,
          }}
        />
      </View>
    );
  }

  if (name === 'list') {
    return (
      <View style={{ width: 22, height: 22, justifyContent: 'center', gap: 4 }}>
        {[0, 1, 2].map((item) => (
          <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: color }} />
            <View style={{ width: 13, height: 2, borderRadius: 2, backgroundColor: color }} />
          </View>
        ))}
      </View>
    );
  }

  if (name === 'map') {
    return (
      <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 16,
            height: 16,
            borderWidth: 2,
            borderColor: color,
            borderRadius: 10,
            borderBottomLeftRadius: 3,
            transform: [{ rotate: '-45deg' }],
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              width: 4,
              height: 4,
              borderRadius: 3,
              backgroundColor: color,
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <View style={{ width: 7, height: 7, borderWidth: 2, borderColor: color, borderRadius: 5 }} />
      <View
        style={{
          width: 15,
          height: 8,
          borderWidth: 2,
          borderColor: color,
          borderBottomWidth: 2,
          borderTopLeftRadius: 9,
          borderTopRightRadius: 9,
          borderBottomLeftRadius: 4,
          borderBottomRightRadius: 4,
        }}
      />
    </View>
  );
}

export function RoleTabBar({ state, navigation, items, action }: RoleTabBarProps) {
  const insets = useSafeAreaInsets();

  const renderItem = (item: RoleTabItem) => {
    const routeIndex = state.routes.findIndex((route) => route.name === item.route);
    const route = state.routes[routeIndex];
    if (!route) return null;

    const selected = routeIndex === state.index;
    const color = selected ? '#16A34A' : '#94A3B8';

    return (
      <Pressable
        key={item.route}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        accessibilityLabel={item.label}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!event.defaultPrevented) {
            if (item.onPress) item.onPress();
            else if (!selected) navigation.navigate(item.route);
          }
        }}
        className="min-w-0 flex-1 items-center justify-center px-1 py-2"
      >
        <TabIcon name={item.icon} color={color} />
        <Text style={{ marginTop: 4, color, fontSize: 10, fontWeight: selected ? '800' : '600' }}>
          {item.label}
        </Text>
        <View
          style={{
            marginTop: 3,
            width: selected ? 16 : 4,
            height: 2.5,
            borderRadius: 2,
            backgroundColor: selected ? '#16A34A' : 'transparent',
          }}
        />
      </Pressable>
    );
  };

  return (
    <View
      className="flex-row items-center border-t border-slate-100 bg-white px-3 pt-2 shadow-sm"
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
    >
      {action && items.length > 1 ? (
        <>
          {items.slice(0, 1).map(renderItem)}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            className="-mt-7 mx-2 h-14 w-14 items-center justify-center rounded-full bg-emerald-600 border-4 border-white shadow-xl shadow-emerald-950/30"
          >
            <Text style={{ fontSize: 20 }}>📷</Text>
          </Pressable>
          {items.slice(1).map(renderItem)}
        </>
      ) : (
        items.map(renderItem)
      )}
    </View>
  );
}
