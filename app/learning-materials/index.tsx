import { AIChatbot } from '@/components/ai-chatbot';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '../config';
import * as DocumentPicker from 'expo-document-picker';
import { EncodingType } from 'expo-file-system';
import { readAsStringAsync } from 'expo-file-system/legacy';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useTranslation } from 'react-i18next';

type LearningMaterial = {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  materialType: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  fileUrl: string | null;
  filePath: string | null;
  videoUrl: string | null;
};

type SelectedFile = {
  base64: string;
  name?: string;
  type?: string;
  size?: number;
};

const TOPIC_VALUES = [
  'STRATEGI_PENYELESAIAN_MASALAH',
  'ALGORITMA',
  'PEMBOLEH_UBAH_PEMALAR_JENIS_DATA',
  'STRUKTUR_KAWALAN',
  'AMALAN_TERBAIK_PENGATURCARAAN',
  'STRUKTUR_DATA_MODULAR',
  'PEMBANGUNAN_APLIKASI',
] as const;

const TYPE_VALUES = ['NOTES', 'VIDEO', 'EXERCISE'] as const;

const isTopicValue = (value: string): value is (typeof TOPIC_VALUES)[number] =>
  TOPIC_VALUES.includes(value as (typeof TOPIC_VALUES)[number]);

const isTypeValue = (value: string): value is (typeof TYPE_VALUES)[number] =>
  TYPE_VALUES.includes(value as (typeof TYPE_VALUES)[number]);

const FILE_MIME_FILTER = ['image/*', 'application/pdf'];

export default function LearningMaterialsScreen() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef<TextInput | null>(null);

  const [topicFilter, setTopicFilter] = useState<'ALL' | string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | string>('ALL');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<LearningMaterial | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTopic, setFormTopic] = useState<(typeof TOPIC_VALUES)[number]>(TOPIC_VALUES[0]);
  const [formType, setFormType] = useState<(typeof TYPE_VALUES)[number]>(TYPE_VALUES[0]);
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formFile, setFormFile] = useState<SelectedFile | null>(null);
  const [formExistingFilePath, setFormExistingFilePath] = useState<string | null>(null);
  const [formExistingFileUrl, setFormExistingFileUrl] = useState<string | null>(null);
  const [formRemoveFile, setFormRemoveFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickingFile, setPickingFile] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);

  const isTeacher = user?.role === 'Teacher';
  const userIdNumber = useMemo(() => {
    if (!user?.id) return null;
    const numeric = Number(user.id);
    return Number.isFinite(numeric) ? numeric : null;
  }, [user?.id]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const normalizeMaterial = useCallback((raw: any): LearningMaterial => {
    const rawFileUrl = typeof raw.fileUrl === 'string' ? raw.fileUrl : null;
    return {
      id: String(raw.id),
      title: raw.title,
      description: raw.description ?? null,
      topic: String(raw.topic),
      materialType: String(raw.materialType),
      authorId: raw.authorId != null ? String(raw.authorId) : '',
      authorName: raw.authorName ?? raw.author?.username ?? raw.author?.email ?? 'Unknown',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      fileUrl: rawFileUrl ? toAbsoluteUrl(rawFileUrl) : null,
      filePath: rawFileUrl,
      videoUrl: raw.videoUrl ?? null,
    };
  }, []);

  const loadMaterials = useCallback(
    async (options?: { signal?: AbortSignal; isRefresh?: boolean }) => {
      const { signal, isRefresh } = options ?? {};
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        if (debouncedQuery) params.append('q', debouncedQuery);
        if (topicFilter !== 'ALL') params.append('topic', topicFilter);
        if (typeFilter !== 'ALL') params.append('type', typeFilter);
        const query = params.toString();
        const response = await fetch(
          `${API_URL}/api/learning-materials${query ? `?${query}` : ''}`,
          { signal }
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || t('materials_alerts.load_failed'));
        }
        const payload = await response.json();
        const normalized = Array.isArray(payload)
          ? payload.map((item) => normalizeMaterial(item))
          : [];
        setMaterials(normalized);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('Learning materials fetch error:', err);
        setError(err?.message ?? t('materials_alerts.load_failed'));
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [debouncedQuery, topicFilter, typeFilter, normalizeMaterial, t]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadMaterials({ signal: controller.signal });
    return () => controller.abort();
  }, [loadMaterials]);

  const topicChips = useMemo(
    () => [
      { label: t('materials.all_topics'), value: 'ALL' },
      ...TOPIC_VALUES.map((value) => ({
        label: t(`materials_topics.${value}`),
        value,
      })),
    ],
    [t]
  );

  const typeChips = useMemo(
    () => [
      { label: t('materials.all_types'), value: 'ALL' },
      ...TYPE_VALUES.map((value) => ({
        label: t(`materials_types.${value}`),
        value,
      })),
    ],
    [t]
  );

  const resetForm = useCallback(() => {
    setFormTitle('');
    setFormDescription('');
    setFormTopic(TOPIC_VALUES[0]);
    setFormType(TYPE_VALUES[0]);
    setFormVideoUrl('');
    setFormFile(null);
    setFormExistingFilePath(null);
    setFormExistingFileUrl(null);
    setFormRemoveFile(false);
    setSubmitting(false);
    setPickingFile(false);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingMaterial(null);
    resetForm();
  }, [resetForm]);

  const openCreateModal = useCallback(() => {
    setEditingMaterial(null);
    resetForm();
    setModalVisible(true);
    setTimeout(() => searchInputRef.current?.blur(), 0);
  }, [resetForm]);

  const openEditModal = useCallback(
    (material: LearningMaterial) => {
      setEditingMaterial(material);
      setFormTitle(material.title);
      setFormDescription(material.description ?? '');
      setFormTopic(material.topic);
      setFormType(material.materialType);
      setFormVideoUrl(material.videoUrl ?? '');
      setFormExistingFilePath(material.filePath);
      setFormExistingFileUrl(material.fileUrl);
      setFormFile(null);
      setFormRemoveFile(false);
      setModalVisible(true);
      setTimeout(() => searchInputRef.current?.blur(), 0);
    },
    []
  );

  const handleSelectTopic = useCallback((value: (typeof TOPIC_VALUES)[number]) => {
    setFormTopic(value);
  }, []);

  const handleSelectType = useCallback(
    (value: (typeof TYPE_VALUES)[number]) => {
      setFormType(value);
      if (value === 'VIDEO') {
        setFormFile(null);
        if (formExistingFilePath) {
          setFormRemoveFile(true);
        }
      } else {
        setFormVideoUrl('');
      }
    },
    [formExistingFilePath]
  );

  const handlePickFile = useCallback(async () => {
    try {
      if (formType === 'VIDEO') {
        Alert.alert(
          t('materials_alerts.video_material_title'),
          t('materials_alerts.video_material_body')
        );
        return;
      }
      setPickingFile(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: FILE_MIME_FILTER,
        multiple: false,
        copyToCacheDirectory: true,
      });

      // Handle new and legacy return shapes
      const asset =
        (Array.isArray((result as any)?.assets) && (result as any).assets[0]) ||
        ((result as any)?.type === 'success' ? result : null);

      if (!asset || (asset.type && asset.type === 'cancel')) {
        setPickingFile(false);
        return;
      }

      const uri: string = asset.uri;
      if (!uri) {
        Alert.alert(
          t('materials_alerts.file_selection_title'),
          t('materials_alerts.file_selection_unreadable')
        );
        return;
      }

      const base64 = await readAsStringAsync(uri, {
        encoding: (EncodingType as any)?.Base64 ?? 'base64',
      } as any);

      const mimeType =
        asset.mimeType ||
        (asset.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      const filePayload: SelectedFile = {
        base64: `data:${mimeType};base64,${base64}`,
        name: asset.name,
        type: mimeType,
        size: typeof asset.size === 'number' ? asset.size : undefined,
      };

      setFormFile(filePayload);
      setFormExistingFilePath(null);
      setFormExistingFileUrl(null);
      setFormRemoveFile(false);
    } catch (err) {
      console.error('File picker error:', err);
      Alert.alert(
        t('materials_alerts.file_selection_title'),
        t('materials_alerts.file_selection_retry')
      );
    } finally {
      setPickingFile(false);
    }
  }, [formType, t]);

  const handleRemoveExistingFile = useCallback(() => {
    setFormExistingFilePath(null);
    setFormExistingFileUrl(null);
    setFormRemoveFile(true);
  }, []);

  const validateForm = useCallback(() => {
    if (!formTitle.trim()) {
      Alert.alert(
        t('materials_alerts.validation_title'),
        t('materials_alerts.validation_title_message')
      );
      return false;
    }
    if (!isTopicValue(formTopic)) {
      Alert.alert(
        t('materials_alerts.validation_topic'),
        t('materials_alerts.validation_topic_message')
      );
      return false;
    }
    if (!isTypeValue(formType)) {
      Alert.alert(
        t('materials_alerts.validation_type'),
        t('materials_alerts.validation_type_message')
      );
      return false;
    }

    if (formType === 'VIDEO') {
      if (!formVideoUrl.trim()) {
        Alert.alert(
          t('materials_alerts.validation_video'),
          t('materials_alerts.validation_video_message')
        );
        return false;
      }
      return true;
    }

    return true;
  }, [formTitle, formTopic, formType, formVideoUrl, t]);

  const submitForm = useCallback(async () => {
    if (!isTeacher || userIdNumber == null) {
      Alert.alert(
        t('materials_alerts.permission_denied_title'),
        t('materials_alerts.permission_denied_message')
      );
      return;
    }

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload: any = {
        title: formTitle.trim(),
        description: formDescription.trim() ? formDescription.trim() : null,
        topic: formTopic,
        materialType: formType,
        authorId: userIdNumber,
        videoUrl: formType === 'VIDEO' ? formVideoUrl.trim() : undefined,
      };

    if (formType !== 'VIDEO') {
      if (formFile) {
        payload.fileData = {
          base64: formFile.base64,
          type: formFile.type,
          name: formFile.name,
        };
      } else if (formRemoveFile && editingMaterial) {
        payload.removeFile = true;
      }
      }

      const endpoint = editingMaterial
        ? `${API_URL}/api/learning-materials/${editingMaterial.id}`
        : `${API_URL}/api/learning-materials`;

      const method = editingMaterial ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.error || t('materials_alerts.save_failed_title'));
      }

      await loadMaterials({ isRefresh: false });
      closeModal();
    } catch (err: any) {
      console.error('Submit learning material error:', err);
      Alert.alert(t('materials_alerts.save_failed_title'), err?.message ?? t('materials_alerts.network_error'));
    } finally {
      setSubmitting(false);
    }
  }, [
    isTeacher,
    userIdNumber,
    validateForm,
    formTitle,
    formDescription,
    formTopic,
    formType,
    formVideoUrl,
    formFile,
    formRemoveFile,
    editingMaterial,
    loadMaterials,
    closeModal,
    t,
  ]);

  const handleDelete = useCallback(
    (material: LearningMaterial) => {
      if (!isTeacher || userIdNumber == null) {
        Alert.alert(
          t('materials_alerts.permission_denied_title'),
          t('materials_alerts.permission_denied_message')
        );
        return;
      }
      Alert.alert(
        t('materials_alerts.delete_confirm_title'),
        t('materials_alerts.delete_confirm_message'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await fetch(
                  `${API_URL}/api/learning-materials/${material.id}?authorId=${userIdNumber}`,
                  { method: 'DELETE' }
                );
                if (!response.ok) {
                  const payload = await response.json().catch(() => ({}));
                  throw new Error(payload.error || t('materials_alerts.delete_failed_title'));
                }
                await loadMaterials({ isRefresh: false });
              } catch (err: any) {
                console.error('Delete learning material error:', err);
                Alert.alert(
                  t('materials_alerts.delete_failed_title'),
                  err?.message ?? t('materials_alerts.network_error')
                );
              }
            },
          },
        ]
      );
    },
    [isTeacher, userIdNumber, loadMaterials, t]
  );

  const canEditMaterial = useCallback(
    (material: LearningMaterial) => {
      if (!isTeacher || !user?.id) return false;
      return material.authorId === String(user.id);
    },
    [isTeacher, user?.id]
  );

  const onRefresh = useCallback(() => {
    loadMaterials({ isRefresh: true });
  }, [loadMaterials]);

  const openResource = useCallback(
    async (material: LearningMaterial) => {
      try {
        if (material.materialType === 'VIDEO' && material.videoUrl) {
          const supported = await Linking.canOpenURL(material.videoUrl);
          if (supported) {
            await Linking.openURL(material.videoUrl);
          } else {
            Alert.alert(
              t('materials_alerts.open_url_failed_title'),
              t('materials_alerts.open_url_failed_message')
            );
          }
          return;
        }

        if (material.fileUrl) {
          const supported = await Linking.canOpenURL(material.fileUrl);
          if (supported) {
            await Linking.openURL(material.fileUrl);
          } else {
            Alert.alert(
              t('materials_alerts.open_file_failed_title'),
              t('materials_alerts.open_file_failed_message')
            );
          }
          return;
        }

        Alert.alert(
          t('materials_alerts.no_resource_title'),
          t('materials_alerts.no_resource_message')
        );
      } catch (err) {
        console.error('Open resource error:', err);
        Alert.alert(
          t('materials_alerts.open_failed_title'),
          t('materials_alerts.open_failed_message')
        );
      }
    },
    [t]
  );

  const renderMaterial = useCallback(
    ({ item }: { item: LearningMaterial }) => {
      const topicLabel = t(`materials_topics.${item.topic}`, {
        defaultValue: item.topic,
      });
      const typeLabel = t(`materials_types.${item.materialType}`, {
        defaultValue: item.materialType,
      });
      const isOwner = canEditMaterial(item);

      return (
        <View
          style={[
            styles.card,
            colorScheme === 'dark' ? styles.cardDark : styles.cardLight,
          ]}
        >
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.cardTitle,
                colorScheme === 'dark' && styles.cardTitleDark,
              ]}
            >
              {item.title}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{typeLabel}</Text>
              </View>
            </View>
          </View>

          <Text
            style={[
              styles.cardSubtitle,
              colorScheme === 'dark' && styles.cardSubtitleDark,
            ]}
          >
            {topicLabel}
          </Text>

          {item.description ? (
            <Text
              style={[
                styles.cardDescription,
                colorScheme === 'dark' && styles.cardDescriptionDark,
              ]}
              numberOfLines={4}
            >
              {item.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <IconSymbol name="person.fill" size={16} color="#60A5FA" />
            <Text
              style={[
                styles.metaText,
                colorScheme === 'dark' && styles.metaTextDark,
              ]}
            >
              {item.authorName}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <IconSymbol name="clock.fill" size={16} color="#60A5FA" />
            <Text
              style={[
                styles.metaText,
                colorScheme === 'dark' && styles.metaTextDark,
              ]}
            >
              {t('materials.updated_at', { date: formatTimestamp(item.updatedAt, t) })}
            </Text>
          </View>

          <View style={styles.cardActions}>
            {((item.materialType === 'VIDEO' && item.videoUrl) ||
              (item.materialType !== 'VIDEO' && item.fileUrl)) && (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => openResource(item)}
              >
                <IconSymbol
                  name={item.materialType === 'VIDEO' ? 'play.circle.fill' : 'doc.text.fill'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryButtonText}>
                  {item.materialType === 'VIDEO'
                    ? t('materials.button_watch')
                    : t('materials.button_view')}
                </Text>
              </Pressable>
            )}
            {isOwner ? (
              <View style={styles.ownerActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => openEditModal(item)}
                >
                  <IconSymbol name="pencil" size={16} color="#2563EB" />
                  <Text style={styles.secondaryButtonText}>{t('common.edit')}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleDelete(item)}
                >
                  <IconSymbol name="trash" size={16} color="#DC2626" />
                  <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      );
    },
    [canEditMaterial, colorScheme, openResource, openEditModal, handleDelete, t]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('materials.title')}</Text>
        <Text style={styles.subtitle}>{t('materials.subtitle')}</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <IconSymbol name="magnifyingglass" size={18} color="#6B7280" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={t('learning_ui.search_placeholder')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.filtersSection}>
        <Text style={styles.filtersLabel}>{t('learning_ui.topic_label')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsContainer}
        >
          {topicChips.map((chip) => (
            <FilterChip
              key={chip.value}
              label={chip.label}
              active={topicFilter === chip.value}
              onPress={() => setTopicFilter(chip.value)}
            />
          ))}
        </ScrollView>

        <Text style={[styles.filtersLabel, styles.filterGroupSpacing]}>
          {t('learning_ui.type_label')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsContainer}
        >
          {typeChips.map((chip) => (
            <FilterChip
              key={chip.value}
              label={chip.label}
              active={typeFilter === chip.value}
              onPress={() => setTypeFilter(chip.value)}
            />
          ))}
        </ScrollView>
      </View>

      {isTeacher ? (
        <Pressable style={styles.createButton} onPress={openCreateModal}>
          <IconSymbol name="plus.circle.fill" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>{t('learning_ui.create_button')}</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={materials}
        keyExtractor={(item) => item.id}
        renderItem={renderMaterial}
        contentContainerStyle={[
          styles.listContent,
          !materials.length && !loading ? styles.listEmptyContent : null,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyState}>
              <IconSymbol name="doc.text.magnifyingglass" size={40} color="#93C5FD" />
              <Text style={styles.emptyTitle}>{t('learning_ui.empty_title')}</Text>
              <Text style={styles.emptySubtitle}>{t('learning_ui.empty_description')}</Text>
            </View>
          )
        }
      />

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>{t('learning_ui.loading')}</Text>
        </View>
      ) : null}

      {error ? (
        <Pressable style={styles.errorBanner} onPress={() => loadMaterials()}>
          <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#FACC15" />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorRetry}>{t('learning_ui.refresh_hint')}</Text>
        </Pressable>
      ) : null}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {editingMaterial ? t('materials.modal_edit_title') : t('materials.modal_create_title')}
            </Text>

            <TextInput
              style={styles.input}
              placeholder={t('materials.field_title')}
              placeholderTextColor="#94A3B8"
              value={formTitle}
              onChangeText={setFormTitle}
            />

            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder={t('materials.field_description')}
              placeholderTextColor="#94A3B8"
              value={formDescription}
              onChangeText={setFormDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>{t('learning_ui.topic_label')}</Text>
              <View style={styles.optionWrap}>
                {TOPIC_VALUES.map((value) => (
                  <FilterChip
                    key={value}
                    label={t(`materials_topics.${value}`)}
                    active={formTopic === value}
                    onPress={() => handleSelectTopic(value)}
                    compact
                  />
                ))}
              </View>
            </View>

            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>{t('learning_ui.type_label')}</Text>
              <View style={styles.optionWrap}>
                {TYPE_VALUES.map((value) => (
                  <FilterChip
                    key={value}
                    label={t(`materials_types.${value}`)}
                    active={formType === value}
                    onPress={() => handleSelectType(value)}
                    compact
                  />
                ))}
              </View>
            </View>

            {formType === 'VIDEO' ? (
              <TextInput
                style={styles.input}
                placeholder={t('materials.field_video_placeholder')}
                placeholderTextColor="#94A3B8"
                value={formVideoUrl}
                onChangeText={setFormVideoUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : (
              <View style={styles.fileSection}>
                <Text style={styles.optionLabel}>{t('materials.supporting_file_label')}</Text>
                {formFile ? (
                  <View style={styles.fileChip}>
                    <IconSymbol name="doc.richtext" size={18} color="#2563EB" />
                    <Text style={styles.fileChipText}>
                      {formFile.name ?? t('materials.selected_file')}
                      {formatFileSize(formFile.size)}
                    </Text>
                    <Pressable onPress={() => setFormFile(null)}>
                      <IconSymbol name="xmark.circle.fill" size={18} color="#DC2626" />
                    </Pressable>
                  </View>
                ) : formExistingFileUrl ? (
                  <View style={styles.fileChip}>
                    <IconSymbol name="doc.text.fill" size={18} color="#2563EB" />
                    <Text style={styles.fileChipText}>
                      {extractFileName(formExistingFilePath) || t('materials.selected_file')}
                    </Text>
                    <Pressable onPress={handleRemoveExistingFile}>
                      <IconSymbol name="trash.circle.fill" size={18} color="#DC2626" />
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.fileHint}>{t('materials.supporting_file_hint')}</Text>
                )}
                <Pressable
                  style={[
                    styles.pickFileButton,
                    pickingFile && styles.pickFileButtonDisabled,
                  ]}
                  onPress={handlePickFile}
                  disabled={pickingFile}
                >
                  <IconSymbol name="square.and.arrow.up" size={18} color="#2563EB" />
                  <Text style={styles.pickFileButtonText}>
                    {pickingFile ? t('materials.selecting_file') : t('materials.choose_file')}
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondary} onPress={closeModal} disabled={submitting}>
                <Text style={styles.modalSecondaryText}>{t('materials.button_cancel')}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalPrimary,
                  submitting && styles.modalPrimaryDisabled,
                ]}
                onPress={submitForm}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimaryText}>
                    {editingMaterial
                      ? t('materials.button_save')
                      : t('materials.button_publish')}
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Floating Chat Bubble */}
      <Pressable
        style={styles.floatingChatButton}
        onPress={() => setShowChatbot(true)}
        accessibilityLabel={t('main.chat_accessibility')}
      >
        <IconSymbol name="message.fill" size={28} color="#FFFFFF" />
      </Pressable>

      {/* AI Chatbot Modal */}
      <AIChatbot visible={showChatbot} onClose={() => setShowChatbot(false)} />
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  compact,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
        compact && styles.chipCompact,
        pressed && styles.chipPressed,
      ]}
      onPress={onPress}
    >
      <Text style={active ? styles.chipTextActive : styles.chipText}>{label}</Text>
    </Pressable>
  );
}

function toAbsoluteUrl(url: string) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${API_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

function formatTimestamp(
  timestamp: string,
  translate: (key: string, options?: any) => string
) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return translate('materials_alerts.unknown_date');
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractFileName(filePath: string | null) {
  if (!filePath) return '';
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || '';
}

function formatFileSize(size?: number) {
  if (!size || size <= 0) return '';
  if (size < 1024) return ` · ${size} B`;
  if (size < 1024 * 1024) return ` · ${(size / 1024).toFixed(1)} KB`;
  return ` · ${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  header: {
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  filtersSection: {
    marginBottom: 16,
  },
  filtersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  filterGroupSpacing: {
    marginTop: 12,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 60,
  },
  listEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    gap: 10,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardTitleDark: {
    color: '#E2E8F0',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  cardSubtitleDark: {
    color: '#BFDBFE',
  },
  cardDescription: {
    fontSize: 14,
    color: '#475569',
  },
  cardDescriptionDark: {
    color: '#CBD5F5',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
  },
  metaTextDark: {
    color: '#CBD5F5',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#93C5FD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFF',
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 13,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 13,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 16,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  loadingText: {
    color: '#E2E8F0',
    fontSize: 13,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  errorText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 13,
  },
  errorRetry: {
    color: '#60A5FA',
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: Platform.select({ ios: 40, android: 40, default: 20 }),
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textarea: {
    height: 120,
  },
  optionGroup: {
    gap: 10,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fileSection: {
    gap: 10,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fileChipText: {
    flex: 1,
    color: '#1D4ED8',
    fontWeight: '600',
    fontSize: 13,
  },
  fileHint: {
    fontSize: 13,
    color: '#64748B',
  },
  pickFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#93C5FD',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFF',
  },
  pickFileButtonDisabled: {
    opacity: 0.65,
  },
  pickFileButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  modalSecondaryText: {
    color: '#1E293B',
    fontWeight: '600',
  },
  modalPrimary: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryDisabled: {
    opacity: 0.7,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  chipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5F5',
  },
  chipText: {
    color: '#1E293B',
    fontWeight: '500',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#1D4ED8',
    fontWeight: '600',
    fontSize: 13,
  },
  chipPressed: {
    opacity: 0.85,
  },
  floatingChatButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});


