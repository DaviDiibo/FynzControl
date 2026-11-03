import React from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';

const PrivacyScreen = (): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Header Cyberpunk */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={22} color="#00FFA3" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Política de Privacidad</Text>
          <View style={styles.headerBadge}>
            <View style={styles.badgeDot} />
            <Text style={styles.headerBadgeText}>PROTOCOLO DE SEGURIDAD</Text>
          </View>
        </View>

        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconBadge}>
            <Ionicons name="shield-checkmark" size={28} color="#00FFA3" />
          </View>
          <Text style={styles.heroTitle}>Soberanía Absoluta de tus Datos</Text>
          <Text style={styles.heroDescription}>
            En ControlFynz creemos que la información financiera es estrictamente personal.
            Diseñamos nuestra arquitectura bajo el principio de privacidad por diseño y
            tolerancia cero a la comercialización de datos.
          </Text>
          <View style={styles.heroMetaRow}>
            <Ionicons name="time-outline" size={14} color="#8E8E93" />
            <Text style={styles.heroMetaText}>Última actualización: Noviembre 2026</Text>
          </View>
        </View>

        {/* Sección 1: Responsable del Tratamiento y Objeto */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="business-outline" size={18} color="#00FFA3" />
            </View>
            <Text style={styles.sectionTitle}>1. Responsable del Tratamiento y Objeto</Text>
          </View>
          <Text style={styles.sectionParagraph}>
            ControlFynz es una plataforma de gestión financiera y contable personal desarrollada
            para permitir el control integral, autónomo y privado de ingresos, gastos, tarjetas de
            crédito, deudas y préstamos.
          </Text>
          <Text style={styles.sectionParagraph}>
            El objeto de este documento es informar con máxima transparencia a los usuarios sobre
            el origen, tratamiento, custodia y derechos aplicables a su información personal al
            utilizar la aplicación y sus servicios sincronizados.
          </Text>
        </View>

        {/* Sección 2: Datos Recopilados */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="layers-outline" size={18} color="#00FFA3" />
            </View>
            <Text style={styles.sectionTitle}>2. Datos Recopilados</Text>
          </View>
          <Text style={styles.sectionParagraph}>
            ControlFynz opera bajo el principio de minimización de datos: únicamente procesamos la
            información estrictamente necesaria para ofrecer los servicios de contabilidad personal:
          </Text>

          <View style={styles.bulletItem}>
            <View style={styles.bulletDot} />
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Datos de Autenticación Básica</Text>
              <Text style={styles.bulletDescription}>
                Dirección de correo electrónico, nombre de perfil y credenciales gestionadas a
                través del servicio de autenticación segura Supabase Auth (mediante Google Sign-In
                o registro directo con correo y contraseña cifrada).
              </Text>
            </View>
          </View>

          <View style={styles.bulletItem}>
            <View style={styles.bulletDot} />
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Datos Financieros y Contables Voluntarios</Text>
              <Text style={styles.bulletDescription}>
                Información ingresada directamente por el usuario: registros de ingresos y gastos,
                categorías, nombres y saldos de cuentas bancarias o billeteras virtuales, registros
                de tarjetas de crédito y sus fechas de corte, deudas personales, amortizaciones y
                nombres de contactos de referencia para el seguimiento de cobros y préstamos.
              </Text>
            </View>
          </View>

          <View style={styles.bulletItem}>
            <View style={styles.bulletDot} />
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Marcas Temporales Técnicas</Text>
              <Text style={styles.bulletDescription}>
                Marcas de tiempo de creación y modificación de registros, requeridas exclusivamente
                por el motor de sincronización Offline-First para resolver la consistencia entre el
                dispositivo y la base de datos.
              </Text>
            </View>
          </View>
        </View>

        {/* Sección 3: Finalidad del Tratamiento y Uso de la Información */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="calculator-outline" size={18} color="#00FFA3" />
            </View>
            <Text style={styles.sectionTitle}>3. Finalidad del Tratamiento</Text>
          </View>
          <Text style={styles.sectionParagraph}>
            Los datos recopilados tienen como finalidad única y exclusiva el funcionamiento del
            motor contable dentro de la aplicación:
          </Text>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#00FFA3" />
            <Text style={styles.featureText}>
              Cálculo y balance en tiempo real del patrimonio neto y disponibilidad financiera.
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#00FFA3" />
            <Text style={styles.featureText}>
              Proyección de cuotas mensuales de tarjetas de crédito y liquidación de deudas.
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#00FFA3" />
            <Text style={styles.featureText}>
              Generación de estadísticas y métricas analíticas de consumo para el usuario.
            </Text>
          </View>

          {/* Declaración Taxativa: No Venta */}
          <View style={styles.highlightBanner}>
            <View style={styles.highlightHeader}>
              <Ionicons name="lock-closed" size={18} color="#00FFA3" />
              <Text style={styles.highlightTitle}>DECLARACIÓN TAXATIVA: NO VENTA DE DATOS</Text>
            </View>
            <Text style={styles.highlightDescription}>
              ControlFynz NO comercializa, NO cede, NO comparte, NO alquila ni monetiza la
              información financiera ni los datos personales de sus usuarios con anunciantes,
              agencias de publicidad, centrales de riesgo crediticio ni terceros bajo ninguna
              circunstancia o modelo comercial.
            </Text>
          </View>
        </View>

        {/* Sección 4: Almacenamiento, Seguridad y Cifrado */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="server-outline" size={18} color="#00FFA3" />
            </View>
            <Text style={styles.sectionTitle}>4. Almacenamiento, Seguridad y Cifrado</Text>
          </View>

          <View style={styles.subCard}>
            <View style={styles.subCardHeader}>
              <Ionicons name="phone-portrait-outline" size={16} color="#00FFA3" />
              <Text style={styles.subCardTitle}>Arquitectura Offline-First</Text>
            </View>
            <Text style={styles.subCardText}>
              La base de datos operativa primaria reside localmente en el almacenamiento seguro de
              tu dispositivo, permitiendo operar sin conexión y asegurando que tus datos sigan
              accesibles incluso sin acceso a internet.
            </Text>
          </View>

          <View style={styles.subCard}>
            <View style={styles.subCardHeader}>
              <Ionicons name="cloud-upload-outline" size={16} color="#38BDF8" />
              <Text style={styles.subCardTitle}>
                Sincronización Supabase con Row Level Security (RLS)
              </Text>
            </View>
            <Text style={styles.subCardText}>
              La sincronización en la nube se ejecuta sobre PostgreSQL administrado mediante
              Supabase. Cada tabla cuenta con políticas estrictas de seguridad a nivel de fila
              (RLS), garantizando por diseño criptográfico y de base de datos que cada usuario solo
              pueda leer y escribir sus propios registros validados por su identificador único
              (auth.uid()).
            </Text>
          </View>

          <View style={styles.subCard}>
            <View style={styles.subCardHeader}>
              <Ionicons name="key-outline" size={16} color="#00FFA3" />
              <Text style={styles.subCardTitle}>Cifrado en Tránsito TLS / HTTPS</Text>
            </View>
            <Text style={styles.subCardText}>
              Toda comunicación entre el dispositivo móvil y los servidores remotos viaja cifrada
              de extremo a extremo mediante protocolos criptográficos modernos TLS 1.3 / HTTPS.
            </Text>
          </View>
        </View>

        {/* Sección 5: Derechos del Usuario y Eliminación de Datos */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="person-circle-outline" size={18} color="#00FFA3" />
            </View>
            <Text style={styles.sectionTitle}>5. Derechos y Supresión Permanente</Text>
          </View>
          <Text style={styles.sectionParagraph}>
            Como titular de tus datos financieros, tienes derechos plenos e irrevocables:
          </Text>

          <View style={styles.bulletItem}>
            <View style={styles.bulletDot} />
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Acceso y Rectificación</Text>
              <Text style={styles.bulletDescription}>
                Puedes revisar, editar o corregir cualquier transacción, tarjeta o saldo
                directamente desde la interfaz en cualquier momento.
              </Text>
            </View>
          </View>

          <View style={styles.bulletItem}>
            <View style={styles.bulletDot} />
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Supresión Autónoma y Definitiva</Text>
              <Text style={styles.bulletDescription}>
                El usuario puede purgar irreversiblemente la totalidad de su cuenta, registros
                locales y registros sincronizados en la nube de forma instantánea y autónoma desde:
              </Text>
              <View style={styles.pathBadge}>
                <Ionicons name="trash-outline" size={14} color="#FF453A" />
                <Text style={styles.pathBadgeText}>
                  Ajustes &gt; Datos &amp; Almacenamiento &gt; Eliminar Cuenta Permanentemente
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sección 6: Modificaciones y Contacto */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="mail-outline" size={18} color="#00FFA3" />
            </View>
            <Text style={styles.sectionTitle}>6. Modificaciones y Contacto</Text>
          </View>
          <Text style={styles.sectionParagraph}>
            Nos reservamos el derecho de actualizar esta política para reflejar avances técnicos,
            mejoras de seguridad o requerimientos normativos. Cualquier cambio relevante será
            reflejado con la actualización de la fecha de vigencia en este documento.
          </Text>
          <Text style={styles.sectionParagraph}>
            Si tienes dudas o inquietudes sobre esta política o la protección de tus datos en
            ControlFynz, puedes comunicarte a través del canal oficial de soporte:
          </Text>
          <View style={styles.contactCard}>
            <Ionicons name="mail" size={18} color="#00FFA3" />
            <Text style={styles.contactEmail}>soporte@controlfynz.app</Text>
          </View>
        </View>

        {/* Botón de cierre / retroceso */}
        <TouchableOpacity
          style={styles.bottomBackButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color="#121212" />
          <Text style={styles.bottomBackButtonText}>ENTENDIDO Y VOLVER</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  headerRightPlaceholder: {
    width: 38,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  // Hero Card
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.3)',
    padding: 20,
    alignItems: 'flex-start',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  heroIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: '100%',
  },
  heroMetaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  // Section Cards
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.2,
    flex: 1,
  },
  sectionParagraph: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  // Bullets
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  bulletContent: {
    flex: 1,
    gap: 2,
  },
  bulletTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  bulletDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  // Feature Checkmarks
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 2,
  },
  featureText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    flex: 1,
  },
  // Highlight Banner
  highlightBanner: {
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.4)',
    borderRadius: 10,
    padding: 14,
    gap: 8,
    marginTop: 6,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  highlightDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.text,
  },
  // Sub Cards
  subCard: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  subCardText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  // Path Badge
  pathBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    marginTop: 6,
  },
  pathBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF453A',
    flex: 1,
  },
  // Contact Card
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contactEmail: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    ...Platform.select({
      web: { fontFamily: 'monospace' },
    }),
  },
  // Bottom button
  bottomBackButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  bottomBackButtonText: {
    color: '#121212',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});

export default PrivacyScreen;
