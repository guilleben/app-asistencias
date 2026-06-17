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
  formatBudgetAmountForPdf,
  formatBudgetDateForPdf,
  type BudgetPdfData,
} from "@/lib/presupuestos";

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
  itemsRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 14,
    marginBottom: 18,
  },
  itemsColumn: {
    flex: 1,
  },
  itemLine: {
    fontFamily: "OpenSans",
    fontWeight: 400,
    fontSize: 9,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  totalLine: {
    fontFamily: "OpenSans",
    fontWeight: 700,
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 14,
  },
  observations: {
    fontFamily: "OpenSans",
    fontWeight: 400,
    fontSize: 9,
    lineHeight: 1.4,
    marginBottom: 8,
  },
  observationsLabel: {
    fontFamily: "OpenSans",
    fontWeight: 700,
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

function splitItems(items: { description: string }[]) {
  if (items.length <= 3) {
    return { left: items, right: [] as { description: string }[] };
  }

  const mid = Math.ceil(items.length / 2);
  return {
    left: items.slice(0, mid),
    right: items.slice(mid),
  };
}

function ItemLine({ description }: { description: string }) {
  return <Text style={styles.itemLine}>• {description}</Text>;
}

export function PresupuestoDocument({ budget }: { budget: BudgetPdfData }) {
  const amountLabel = formatBudgetAmountForPdf(budget.totalAmount);
  const { left, right } = splitItems(budget.items);
  const logoPath = getBenasulinLogoPath();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerWrap}>
          <Image src={logoPath} style={styles.logo} />
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerName}>Fortunato Benasulin</Text>
            <Text style={styles.headerSubtitle}>
              TÉCNICO ELECTROMECANICO NACIONAL
            </Text>
            <Text style={styles.headerServices}>
              INSTALACIONES ELÉCTRICAS-DOMICILIARIAS E INSDUSTRIALES-.CONSTRUCCION DE TABLEROS
            </Text>
            <Text style={styles.headerServices}>
              EQUIPOS CORRECTORES-PROYECTOS-REPARACION EN GENERAL
            </Text>
          </View>
        </View>

        <View style={styles.goldBar}>
          <Text style={styles.goldBarText}>
            MANO DE OBRA DE INSTALACION ELECTRICA
          </Text>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Propietario: </Text>
          <Text style={styles.fieldValue}>{budget.owner}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Obra: </Text>
          <Text style={styles.fieldValue}>{budget.workName}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Ubicación: </Text>
          <Text style={styles.fieldValue}>{budget.location}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Fecha: </Text>
          <Text style={styles.fieldValue}>
            {formatBudgetDateForPdf(budget.date)}
          </Text>
        </View>

        <View style={styles.itemsRow}>
          <View style={styles.itemsColumn}>
            {left.map((item, index) => (
              <ItemLine key={`l-${index}`} description={item.description} />
            ))}
          </View>
          {right.length > 0 ? (
            <View style={styles.itemsColumn}>
              {right.map((item, index) => (
                <ItemLine key={`r-${index}`} description={item.description} />
              ))}
            </View>
          ) : null}
        </View>

        <Text style={styles.totalLine}>
          El monto total del presente presupuesto es de {amountLabel}.
        </Text>

        {budget.observations ? (
          <Text style={styles.observations}>
            <Text style={styles.observationsLabel}>OBSERVACIONES: </Text>
            {budget.observations}
          </Text>
        ) : null}

        <View style={styles.footer} fixed>
          <View style={styles.footerRow}>
            <View style={styles.footerItem}>
              <View style={styles.footerIconWrap}>
                <FooterLocationIcon />
              </View>
              <Text style={styles.footerText}>
                Las Amapolas Nº 226 Bº Jardin
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
