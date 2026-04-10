import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { HomeBanner } from "../../types";
import { useTheme } from "../../theme";
import { AppCard } from "../ui";

interface HomeBannerListProps {
  banners: HomeBanner[];
  onPressBanner: (banner: HomeBanner) => void;
}

export function HomeBannerList({ banners, onPressBanner }: HomeBannerListProps) {
  const { theme } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
      {banners.map((banner) => (
        <Pressable key={banner.id} onPress={() => onPressBanner(banner)}>
      <AppCard style={[styles.card, { borderColor: theme.colors.border }]}>
        <Image
          source={{ uri: banner.imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={(e) => console.log("Lỗi ảnh:", banner.imageUrl, e.nativeEvent)}
        />

        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {banner.title}
          </Text>
          <Text style={[styles.description, { color: theme.colors.textMuted }]}>
            {banner.description}
          </Text>
        </View>
      </AppCard>
    </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 280,
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: 16,
  },
  image: {
    width: "100%",
    height: 140,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
});