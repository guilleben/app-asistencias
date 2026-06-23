import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  FooterEmailIcon,
  FooterLocationIcon,
  FooterPhoneIcon,
} from "@/lib/pdf/footer-icons";
import { getBenasulinLogoPath } from "@/lib/pdf/register-fonts";
import {
  formatMaterialListDateForPdf,
  type MaterialListPdfData,
} from "@/lib/listado-materiales";

const GOLD = "#C5A059";
const BLACK = "#000000";
const PAGE_PADDING = 36;

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 64,
    paddingHorizontal: PAGE_PADDING,
    fontFamily: "OpenSans",
    fontSize: 9,
    color: BLACK,
    position: "relative",
  },
  headerWrap: {
    marginBottom: 12,
    position: "relative",
    minHeight: 50,
  },
  logo: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 118,
    height: 44,
    objectFit: "contain",
  },
  headerTextBlock: {
    alignItems: "center",
    paddingTop: 2,
  },
  headerName: {
    fontFamily: "Montserrat",
    fontWeight: 700,
    fontSize: 16,
    marginBottom: 4,
    textAlign: "center",
  },
  headerSubtitle: {
    fontFamily: "OpenSans",
    fontWeight: 700,
    fontSize: 8.5,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 3,
  },
  headerServices: {
    fontFamily: "OpenSans",
    fontWeight: 400,
    fontSize: 7,
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 1.35,
  },
  goldBar: {
    backgroundColor: GOLD,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    marginHorizontal: -PAGE_PADDING,
  },
  goldBarText: {
    fontFamily: "OpenSans",
    fontWeight: 700,
    fontSize: 9.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 3,
    fontSize: 9.5,
  },
  fieldLabel: {
    fontFamily: "OpenSans",
    fontWeight: 700,
  },
  fieldValue: {
    fontFamily: "OpenSans",
    fontWeight: 400,
  },
  sectionTitle: {
    fontFamily: "OpenSans",
    fontWeight: 700,
    fontSize: 11,
    marginTop: 14,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  colItem: {
    width: "8%",
    fontFamily: "OpenSans",
    fontWeight: 400,
    fontSize: 9,
  },
  colDescription: {
    width: "62%",
    fontFamily: "OpenSans",
    fontWeight: 400,
    fontSize: 9,
    paddingRight: 8,
  },
  colQuantity: {
    width: "30%",
    fontFamily: "OpenSans",
    fontWeight: 400,
    fontSize: 9,
  },
  colHeader: {
    fontFamily: "OpenSans",
    fontWeight: 700,
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: GOLD,
    paddingTop: 18,
    paddingBottom: 12,
    paddingHorizontal: 24,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  footerItem: {
    width: "31%",
    alignItems: "center",
  },
  footerIconWrap: {
    marginTop: -22,
    marginBottom: 4,
  },
  footerText: {
    fontFamily: "OpenSans",
    fontWeight: 400,
    fontSize: 7.5,
    textAlign: "center",
    lineHeight: 1.3,
  },
});

export function ListadoMaterialesDocument({
  list,
}: {
  list: MaterialListPdfData;
}) {
  const logoPath = getBenasulinLogoPath();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerWrap}>
          <Image src={logoPath} style={styles.logo} />
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerName}>Fortunato Benasulin</Text>
            <Text style={styles.headerSubtitle}>
              TÉCNICO ELECTROMECÁNICO NACIONAL
            </Text>
            <Text style={styles.headerServices}>
              INSTALACIONES ELÉCTRICAS DOMICILIARIAS E INDUSTRIALES - CONSTRUCCIÓN DE TABLEROS
            </Text>
            <Text style={styles.headerServices}>
              EQUIPOS CORRECTORES - PROYECTOS - REPARACIÓN EN GENERAL
            </Text>
          </View>
        </View>

        <View style={styles.goldBar}>
          <Text style={styles.goldBarText}>LISTADO DE MATERIALES</Text>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Propietario: </Text>
          <Text style={styles.fieldValue}>{list.owner}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Obra: </Text>
          <Text style={styles.fieldValue}>{list.workName}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Ubicación: </Text>
          <Text style={styles.fieldValue}>{list.location}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Fecha: </Text>
          <Text style={styles.fieldValue}>
            {formatMaterialListDateForPdf(list.date)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Lista de Materiales</Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.colItem, styles.colHeader]}>Ítem</Text>
          <Text style={[styles.colDescription, styles.colHeader]}>
            Descripción
          </Text>
          <Text style={[styles.colQuantity, styles.colHeader]}>Cantidad</Text>
        </View>

        {list.items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.colItem}>{index + 1}</Text>
            <Text style={styles.colDescription}>{item.description}</Text>
            <Text style={styles.colQuantity}>{item.quantity}</Text>
          </View>
        ))}

        <View style={styles.footer} fixed>
          <View style={styles.footerRow}>
            <View style={styles.footerItem}>
              <View style={styles.footerIconWrap}>
                <FooterLocationIcon />
              </View>
              <Text style={styles.footerText}>
                Las Amapolas Nº 226 Bº Jardín
              </Text>
            </View>
            <View style={styles.footerItem}>
              <View style={styles.footerIconWrap}>
                <FooterEmailIcon />
              </View>
              <Text style={styles.footerText}>fbenasulin@hotmail.com</Text>
            </View>
            <View style={styles.footerItem}>
              <View style={styles.footerIconWrap}>
                <FooterPhoneIcon />
              </View>
              <Text style={styles.footerText}>
                03794 15542182 / 03794 15670073
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
