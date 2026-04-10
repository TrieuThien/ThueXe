import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";

import { AppHeader, PrimaryButton, TextField } from "../../components";
import { AccountStackParamList } from "../../navigation";
import { useAuthStore } from "../../store";
import { useTheme } from "../../theme";
import { User } from "../../types";

type Props = NativeStackScreenProps<AccountStackParamList, "AccountProfile">;

type GenderOption = "male" | "female" | "other" | "";

function splitFullName(fullName?: string): { firstName: string; lastName: string } {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function AccountProfileScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.currentUser);
  const setProfile = useAuthStore((state) => state.setProfile);
  const fullNameParts = useMemo(() => splitFullName(currentUser?.fullName), [currentUser?.fullName]);

  const [firstName, setFirstName] = useState(currentUser?.firstName ?? fullNameParts.firstName);
  const [lastName, setLastName] = useState(currentUser?.lastName ?? fullNameParts.lastName);
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber ?? "");
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [address, setAddress] = useState(currentUser?.address ?? "");
  const [gender, setGender] = useState<GenderOption>((currentUser?.gender as GenderOption) ?? "");
  const [country, setCountry] = useState(currentUser?.country ?? "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl ?? "");

  const onPickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Quyền truy cập", "Bạn cần cấp quyền truy cập thư viện ảnh để chọn ảnh đại diện.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setAvatarUrl(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Ảnh đại diện", "Không thể chọn ảnh từ thiết bị.");
    }
  };

  const onSaveProfile = () => {
    if (!currentUser) {
      return;
    }

    const mergedFullName = `${firstName} ${lastName}`.trim() || currentUser.fullName;
    const mappedGender: User["gender"] = gender || undefined;

    setProfile({
      ...currentUser,
      fullName: mergedFullName,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      phoneNumber: phoneNumber.trim() || currentUser.phoneNumber,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      gender: mappedGender,
      country: country.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });

    Alert.alert("Hồ sơ", "Đã lưu thông tin cá nhân");
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
      <AppHeader title="Hồ sơ" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.avatarContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.avatarText, { color: theme.colors.text }]}>{(currentUser?.fullName?.[0] ?? "K").toUpperCase()}</Text>
            </View>
          )}
          <Text style={[styles.avatarHint, { color: theme.colors.textMuted }]}>Ảnh đại diện (`users.photo_file`)</Text>
          <Pressable
            onPress={onPickAvatar}
            style={[styles.pickImageButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
          >
            <Text style={[styles.pickImageText, { color: theme.colors.text }]}>Chọn ảnh từ thiết bị</Text>
          </Pressable>
        </View>

        <TextField label="Họ" value={firstName} onChangeText={setFirstName} placeholder="Nguyen" />
        <TextField label="Tên" value={lastName} onChangeText={setLastName} placeholder="Van A" />

        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Giới tính (`users.sex`)</Text>
          <View style={[styles.pickerWrap, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}> 
            <Picker
              selectedValue={gender}
              onValueChange={(value) => setGender(value as GenderOption)}
              style={[styles.picker, { color: theme.colors.text }]}
              dropdownIconColor={theme.colors.textMuted}
            >
              <Picker.Item label="Chọn giới tính" value="" />
              <Picker.Item label="Nam" value="male" />
              <Picker.Item label="Nữ" value="female" />
              <Picker.Item label="Khác" value="other" />
            </Picker>
          </View>
        </View>

        <TextField label="Số điện thoại" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholder="+84912345678" />
        <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@email.com" />
        <TextField label="Địa chỉ" value={address} onChangeText={setAddress} placeholder="123 Đường ABC, TP.HCM" />
        <TextField label="Quốc gia" value={country} onChangeText={setCountry} placeholder="Vietnam" />

        <PrimaryButton title="Lưu thay đổi" onPress={onSaveProfile} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  avatarContainer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "800",
  },
  avatarHint: {
    fontSize: 12,
  },
  pickImageButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pickImageText: {
    fontSize: 13,
    fontWeight: "700",
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  pickerWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  picker: {
    height: 48,
  },
});
