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

const TermsScreen = (): JSX.Element => {
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
          <Text style={styles.headerTitle}>Términos y Condiciones</Text>
          <View style={styles.headerBadge}>
            <View style={styles.badgeDot} />
            <Text style={styles.headerBadgeText}>CONDICIONES DE SERVICIO</Text>
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
            <Ionicons name="document-text" size={28} color="#00FFA3" />
          </View>
          <Text style={styles.heroTitle}>Marco Legal y Condiciones de Uso</Text>
          <Text style={styles.heroDescription}>
            Bienvenido a ControlFynz. Las presentes condiciones regulan el acceso, alcance,
            derechos y obligaciones al utilizar nuestra plataforma de organización y control
            contable personal.
          </Text>
          <View style={styles.heroMetaRow}>
            <Ionicons name="time-outline" size={14} color="#8E8E93" />
            <Text style={styles.heroMetaText}>Última actualización: Noviembre 2026</Text>
          </View>
        </View>

        {/* Sección 1: Aceptación de los Términos */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="checkmark-done-circle-outline" size={18} color="#00FFA3" />
            </View>
            <Text style={styles.sectionTitle}>1. Aceptación de los Términos</Text>
          </View>
          <Text style={styles.sectionParagraph}>
            El acceso, descarga, instalación y utilización de ControlFynz constituye la aceptación
            plena, voluntaria y vinculante de la totalidad de estas condiciones por parte del usuario.
          </Text>
          <Text style={styles.sectionParagraph}>
            Si no estás de acuerdo con alguna de las cláusulas o disposiciones descritas en este
            documento, debes abstenerte de utilizar la aplicación y proceder a su desinstalación.
          </Text>
        </View>

        {/* Sección 2: Naturaleza del Servicio y Exención Financiera */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="calculator-outline" size={18} color="#00FFA3" />
            </View>
            <Text style={styles.sectionTitle}>2. Naturaleza del Servicio y Exención Financiera</Text>
          </View>
          <Text style={styles.sectionParagraph}>
            ControlFynz es una herramienta de software destinada exclusivamente a la organización,
            registro, proyección y análisis contable personal de ingresos, gastos, tarjetas de crédito,
            deudas y préstamos a terceros.
          </Text>

          {/* Exención expresa */}
          <View style={styles.highlightBanner}>
            <View style={styles.highlightHeader}>
              <Ionicons name="alert-circle" size={18} color="#00FFA3" />
              <Text style={styles.highlightTitle}>DECLARACIÓN EXPRESA: EXENCIÓN FINANCIERA</Text>
            </View>
            <Text style={styles.highlightDescription}>
              ControlFynz NO constituye una entidad bancaria, institución financiera, cooperativa de
              crédito, casa de cambio, billetera de custodia monetaria ni pasarela de procesamiento
              de pagos. La plataforma NO capta fondos del público, NO ejecuta transferencias de
              dinero ni presta servicios de asesoramiento financiero, contable, fiscal o de inversión
              regulado. Todos los balances, proyecciones y semáforos temporales son de naturaleza
              estrictamente estimativa e informativa.
            </Text>
          </View>
        </View>

        {/* Sección 3: Registro, Cuenta y Responsabilidad del Usuario */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="person-circle-outline" size={18} color="#00FFA3" />
            </View>
            <Text style={styles.sectionTitle}>3. Registro, Cuenta y Responsabilidad del Usuario</Text>
          </View>
          <Text style={styles.sectionParagraph}>
            El usuario puede crear una cuenta mediante correo electrónico y contraseña o mediante
            proveedores de autenticación federada (Google Sign-In) a través de Supabase Auth:
          </Text>

          <View style={styles.bulletItem}>
            <View style={styles.bulletDot} />
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Exactitud de los Datos Ingresados</Text>
              <Text style={styles.bulletDescription}>
                El usuario es el único y exclusivo responsable de la veracidad, exactitud y actualización
                de los importes, fechas de corte, cuotas de préstamos y clasificaciones contables que
                decida ingresar en el sistema.
              </Text>
            </View>
          </View>

          <View style={styles.bulletItem}>
            <View style={styles.bulletDot} />
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Confidencialidad de Acceso</Text>
              <Text style={styles.bulletDescription}>
                El usuario asume el compromiso de mantener la debida confidencialidad de sus
                credenciales de acceso. Cualquier actividad realizada desde una sesión autenticada
                se considerará efectuada directamente por el titular de la cuenta.
              </Text>
            </View>
          </View>
        </View>

        {/* Sección 4: Propiedad Intelectual */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="code-slash-outline" size={18} color="#00FFA3" />
            </View>
            <Text style={styles.sectionTitle}>4. Propiedad Intelectual</Text>
          </View>
          <Text style={styles.sectionParagraph}>
            Los derechos de propiedad intelectual e industrial sobre el código fuente, diseño gráfico,
            arquitectura de software, componentes visuales, marcas registradas, logotipos y nombres
            comerciales de ControlFynz pertenecen exclusivamente a sus creadores y licenciantes.
          </Text>
          <Text style={styles.sectionParagraph}>
            Se otorga al usuario una licencia de uso personal, no comercial, revocable, no exclusiva y
            no transferible para utilizar la aplicación en sus dispositivos compatibles. Queda
            terminantemente prohibida la ingeniería inversa, descompilación, copia, distribución o
            explotación no autorizada de cualquier elemento de la plataforma.
          </Text>
        </View>

        {/* Sección 5: Disponibilidad y Modelo Offline-First */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="cloud-offline-outline" size={18} color="#00FFA3" />
            </View>
            <Text style={styles.sectionTitle}>5. Disponibilidad y Modelo Offline-First</Text>
          </View>

          <View style={styles.subCard}>
            <View style={styles.subCardHeader}>
              <Ionicons name="phone-portrait-outline" size={16} color="#00FFA3" />
              <Text style={styles.subCardTitle}>Operación Local Continua</Text>
            </View>
            <Text style={styles.subCardText}>
              ControlFynz está estructurada bajo un modelo Offline-First resiliente, permitiendo
              la consulta y el registro de operaciones de forma autónoma en el almacenamiento local
              del dispositivo sin necesidad de conexión constante a la red.
            </Text>
          </View>

          <View style={styles.subCard}>
            <View style={styles.subCardHeader}>
              <Ionicons name="cloud-upload-outline" size={16} color="#38BDF8" />
              <Text style={styles.subCardTitle}>Sincronización en la Nube</Text>
            </View>
            <Text style={styles.subCardText}>
              La sincronización de datos se efectúa a través de servidores seguros en Supabase cuando
              se dispone de conectividad a internet. ControlFynz no se responsabiliza por retrasos,
              interrupciones o fallos de sincronización originados por problemas de conectividad,
              cortes de red de proveedores de internet o factores externos de fuerza mayor.
            </Text>
          </View>
        </View>

        {/* Sección 6: Rescisión y Supresión de Cuenta */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="trash-outline" size={18} color="#00FFA3" />
            </View>
            <Text style={styles.sectionTitle}>6. Rescisión y Supresión de Cuenta</Text>
          </View>
          <Text style={styles.sectionParagraph}>
            El usuario puede rescindir el servicio y finalizar su relación contractual en cualquier
            momento de forma libre y sin costo alguno.
          </Text>
          <Text style={styles.sectionParagraph}>
            Para suprimir su cuenta y la totalidad de los datos contables asociados de forma irreversible,
            el usuario dispone de la función autónoma en la interfaz de la aplicación:
          </Text>

          <View style={styles.pathBadge}>
            <Ionicons name="trash-outline" size={14} color="#FF453A" />
            <Text style={styles.pathBadgeText}>
              Ajustes &gt; Datos &amp; Almacenamiento &gt; Eliminar Cuenta Permanentemente
            </Text>
          </View>
        </View>

        {/* Sección 7: Modificaciones a las Condiciones */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="refresh-outline" size={18} color="#00FFA3" />
            </View>
            <Text style={styles.sectionTitle}>7. Modificaciones a las Condiciones</Text>
          </View>
          <Text style={styles.sectionParagraph}>
            Nos reservamos el derecho de actualizar, modificar o adaptar los presentes Términos y
            Condiciones cuando resulte necesario para incorporar nuevas funciones, adecuaciones
            técnicas o requerimientos normativos.
          </Text>
          <Text style={styles.sectionParagraph}>
            Toda modificación sustancial será reflejada con la actualización de la fecha de vigencia
            en este documento. El uso continuo de la aplicación después de la publicación de dichos
            cambios constituirá la aceptación íntegra de las condiciones actualizadas.
          </Text>
        </View>

        {/* Sección 8: Contacto y Soporte */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="mail-outline" size={18} color="#00FFA3" />
            </View>
            <Text style={styles.sectionTitle}>8. Contacto y Soporte</Text>
          </View>
          <Text style={styles.sectionParagraph}>
            Para consultas, comentarios o requerimientos vinculados con estos Términos y Condiciones,
            el usuario puede contactarse a través del canal oficial de soporte:
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

export default TermsScreen;
