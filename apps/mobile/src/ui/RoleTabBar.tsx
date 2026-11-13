import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface RoleTabItem {
  route: string;
  label: string;
  glyph: string;
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
    glyph: string;
    onPress: () => void;
  };
}

export function RoleTabBar({ state, navigation, items, action }: RoleTabBarProps) {
  const insets = useSafeAreaInsets();
  const renderItem = (item: RoleTabItem) => {
    const routeIndex = state.routes.findIndex((route) => route.name === item.route);
    const route = state.routes[routeIndex];
    if (!route) return null;

    const selected = routeIndex === state.index;

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
          if (!selected && !event.defaultPrevented) navigation.navigate(item.route);
        }}
        className="min-w-0 flex-1 items-center justify-center px-1 py-2"
      >
        <Text className={selected ? 'text-xl font-semibold text-brand-forest' : 'text-xl text-ink-400'}>{item.glyph}</Text>
        <Text className={selected ? 'mt-1 text-[10px] font-bold text-brand-forest' : 'mt-1 text-[10px] font-medium text-ink-500'}>
          {item.label}
        </Text>
        {selected ? <View className="mt-1 h-1 w-5 rounded-full bg-brand-forest" /> : <View className="mt-1 h-1 w-5" />}
      </Pressable>
    );
  };

  return (
    <View
      className="flex-row items-center border-t border-line-subtle bg-white px-3 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {action && items.length > 1 ? (
        <>
          {items.slice(0, 1).map(renderItem)}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            className="-mt-6 mx-2 h-[58px] min-w-[66px] items-center justify-center rounded-2xl bg-brand-forest px-3 shadow-lg"
          >
            <Text className="text-2xl font-medium text-white">{action.glyph}</Text>
            <Text className="mt-0.5 text-[9px] font-bold text-white">{action.label}</Text>
          </Pressable>
          {items.slice(1).map(renderItem)}
        </>
      ) : items.map(renderItem)}
    </View>
  );
}
