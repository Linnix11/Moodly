import type PptxGenJS from 'pptxgenjs'
import type { ActionFeedback, ConsoleScope, DayStat, ReportSummaryRow, TeamAction, TeamOverviewRow, TopicStat } from '../api/types'
import { ACTION_STATUS, ACTION_SUGGESTIONS, ANONYMITY_THRESHOLD, isTag, REPORT_QUESTIONS, reportChoiceLabel } from './constants'
import { formatDecimal, localISO } from './date'
import { type Audience, type PptOptions, SECTIONS, type SectionId } from './pptSections'
import { alertMessage, anonymousTotal, formatPercent, isWatched, participationRate, summarize, trendOf } from './stats'

/** Données du rapport : uniquement ce que la console affiche déjà (agrégé, journées closes). */
export interface PptData {
  scope: ConsoleScope
  days: number
  stats: DayStat[]
  topics: TopicStat[]
  actions: TeamAction[] // publiées sur la période
  anonymous: ReportSummaryRow[]
  teams: TeamOverviewRow[] | null // vue entreprise (RH) seulement
  /** direction : support complet ; equipe : support à présenter aux employés */
  audience: Audience
  feedback: Map<number, ActionFeedback>
}

// Charte WorkZen (mêmes valeurs que lib/theme.ts, sans « # » pour pptxgenjs)
const NAVY = '123B63'
const TEAL = '21A6A6'
const TEAL_DARK = '167B7B' // turquoise foncé : texte sur blanc et en-têtes de tableau (AA)
const SAGE = '8BC9A3'
const MINT = 'DDF3E9'
const PALE = 'EAF5F8'
const WHITE = 'FFFFFF'
const MUTED = '5E7288' // gris teinté bleu (gray-500 de l'app)
const RULE = 'DDE6ED' // filets (gray-200 de l'app)
const RED = 'B91C1C'
const AMBER_BG = 'FEF3C7'
const AMBER_LINE = 'F59E0B'

const MASTER = 'WORKZEN'
const W = 13.33 // LAYOUT_WIDE
const X = 0.6
const CONTENT_W = W - 2 * X

const frDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${formatDecimal(Math.abs(n))}`
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Logo WorkZen en data URL pour pptxgenjs (null si indisponible : le rapport reste généré). */
async function loadLogo(): Promise<string | null> {
  try {
    const blob = await (await fetch('/logo.png')).blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Génère le rapport PowerPoint et le télécharge. pptxgenjs est chargé à la demande.
 * Les sections suivent toujours l'ordre de SECTIONS, quel que soit l'ordre des cases cochées.
 * Renvoie le nombre de diapositives créées (hors suites automatiques de tableaux).
 */
export async function generatePowerPoint(data: PptData, options: PptOptions): Promise<number> {
  const { default: Pptx } = await import('pptxgenjs')
  const logo = await loadLogo()
  const pptx = new Pptx()
  const FONT = options.font

  const { scope, days, stats, topics, audience } = data
  const period = stats.length ? `du ${frDate(stats[0].jour)} au ${frDate(stats[stats.length - 1].jour)}` : `${days} jours`
  const summary = summarize(stats)
  const topTopics = topics.filter((t) => t.nb > 0).slice(0, 3)

  pptx.layout = 'LAYOUT_WIDE' // 13,33 x 7,5 pouces (16:9)
  pptx.title = `WorkZen · ${scope.nom} · ${period}`
  pptx.company = 'WorkZen'
  pptx.subject = audience === 'equipe' ? 'Notre moral et nos actions' : 'Moral des équipes : problèmes et pistes d\'action'

  // Masque commun : liseré turquoise, pied de page et numéro (repris sur les suites de tableaux)
  pptx.defineSlideMaster({
    title: MASTER,
    background: { color: WHITE },
    // Marges en pouces (haut, droite, bas, gauche) : les suites de tableaux s'arrêtent au-dessus du pied de page
    margin: [0.5, X, 0.85, X],
    objects: [
      { rect: { x: 0, y: 0, w: 0.14, h: 7.5, fill: { color: TEAL }, line: { color: TEAL, width: 0 } } },
      { line: { x: X, y: 6.85, w: CONTENT_W, h: 0, line: { color: RULE, width: 0.75 } } },
      { text: { text: `WorkZen · ${scope.nom} · ${period} · données agrégées et anonymes`, options: { x: X, y: 6.92, w: 10.5, h: 0.35, fontFace: FONT, fontSize: 10, color: MUTED } } },
    ],
    slideNumber: { x: W - X - 0.6, y: 6.92, w: 0.6, h: 0.35, fontFace: FONT, fontSize: 10, color: MUTED, align: 'right' },
  })

  let count = 0
  const note = (slide: PptxGenJS.Slide, lines: string[]) => {
    if (options.notes) slide.addNotes(lines.filter(Boolean).join('\n\n'))
  }

  /** Diapositive standard : titre (et sous-titre facultatif) sur le masque. */
  const newSlide = (title: string, subtitle?: string) => {
    const slide = pptx.addSlide({ masterName: MASTER })
    count += 1
    slide.addText(title, { x: X, y: 0.35, w: CONTENT_W, h: 0.75, fontFace: FONT, fontSize: 26, bold: true, color: NAVY, fit: 'shrink' })
    if (subtitle) slide.addText(subtitle, { x: X, y: 1.05, w: CONTENT_W, h: 0.4, fontFace: FONT, fontSize: 14, color: MUTED })
    return slide
  }

  const bullets = (slide: PptxGenJS.Slide, lines: string[], opts: PptxGenJS.TextPropsOptions) =>
    slide.addText(
      lines.map((text) => ({ text, options: { bullet: { indent: 18 }, paraSpaceAfter: 10 } })),
      { fontFace: FONT, fontSize: 16, color: NAVY, valign: 'top', fit: 'shrink', ...opts },
    )

  const headerRow = (labels: string[]): PptxGenJS.TableRow =>
    labels.map((text) => ({ text, options: { bold: true, color: WHITE, fill: { color: TEAL_DARK } } }))

  /** Tableau qui continue sur une nouvelle diapositive (en-tête répété) au lieu d'être coupé. */
  const table = (slide: PptxGenJS.Slide, header: string[], rows: PptxGenJS.TableRow[], opts: PptxGenJS.TableProps) => {
    slide.addTable([headerRow(header), ...rows], {
      x: X, w: CONTENT_W, fontFace: FONT, fontSize: 12, color: NAVY, valign: 'middle',
      border: { type: 'solid', color: RULE, pt: 0.75 }, margin: 0.08,
      autoPage: true, autoPageRepeatHeader: true, autoPageHeaderRows: 1, autoPageSlideStartY: 0.6,
      ...opts,
    })
  }

  /** « En cours · pour le 20/10 » */
  const statusText = (a: TeamAction) =>
    `${ACTION_STATUS[a.status]?.label ?? 'Prévue'}${a.due_date && a.status !== 'faite' ? ` · pour le ${frDate(a.due_date).slice(0, 5)}` : ''}`

  /** Avis anonymes : détail seulement à partir de 3 votes */
  const feedbackText = (id: number) => {
    const f = data.feedback.get(id)
    if (!f || f.nb_votes === 0) return 'Pas encore d\'avis'
    if (f.nb_utile === null || f.nb_insuffisant === null) return 'Moins de 3 avis'
    return `Utile : ${f.nb_utile} · Insuffisant : ${f.nb_insuffisant}`
  }

  const suggestionsFor = (tag: string | undefined) => ACTION_SUGGESTIONS[isTag(tag) ? tag : 'default']

  // ---- Diapositives -------------------------------------------------------

  const addTitle = () => {
    const slide = pptx.addSlide()
    count += 1
    slide.background = { color: NAVY }
    slide.addShape('rect', { x: 0, y: 7.1, w: W, h: 0.4, fill: { color: TEAL }, line: { color: TEAL, width: 0 } })
    if (logo) {
      slide.addShape('roundRect', { x: 0.8, y: 0.7, w: 1.6, h: 1.1, rectRadius: 0.15, fill: { color: WHITE }, line: { color: WHITE, width: 0 } })
      slide.addImage({ data: logo, x: 0.92, y: 0.8, w: 1.36, h: 0.82, sizing: { type: 'contain', w: 1.36, h: 0.82 } })
    }
    slide.addText('WorkZen', { x: logo ? 2.65 : 0.8, y: 0.95, w: 6, h: 0.6, fontFace: FONT, fontSize: 24, bold: true, color: WHITE })
    slide.addText(audience === 'equipe' ? 'Notre moral et nos actions' : 'Moral des équipes : problèmes et pistes d\'action', {
      x: 0.8, y: 2.5, w: 11.5, h: 1.6, fontFace: FONT, fontSize: 40, bold: true, color: WHITE, fit: 'shrink', valign: 'bottom',
    })
    slide.addText(`${scope.nom} · ${days} derniers jours (${period})`, { x: 0.8, y: 4.2, w: 11.5, h: 0.6, fontFace: FONT, fontSize: 20, color: MINT })
    slide.addText(`Généré le ${frDate(localISO())} · données agrégées et anonymes`, { x: 0.8, y: 6.3, w: 11.5, h: 0.5, fontFace: FONT, fontSize: 12, color: MINT })
    note(slide, [
      audience === 'equipe'
        ? 'Objectif : partager avec l\'équipe ce que disent ses réponses, ce qui a été fait, et décider ensemble de la suite.'
        : 'Objectif : faire le point sur le moral, identifier les problèmes principaux et décider d\'actions concrètes.',
      `Rappeler que toutes les données sont anonymes et agrégées : aucune réponse n'est reliée à une personne, et rien n'est affiché sous ${ANONYMITY_THRESHOLD} réponses.`,
    ])
  }

  const addSynthesis = () => {
    const slide = newSlide('Synthèse')
    const participation = participationRate(stats, scope.nb_membres)
    const kpis: [string, string][] = [
      [`Moyenne ${days} j`, summary.avg30 !== null ? `${formatDecimal(summary.avg30)} / 5` : '–'],
      ['7 derniers jours', summary.last7 !== null ? `${formatDecimal(summary.last7)} / 5` : '–'],
      ['Tendance 7 j', summary.trend !== null ? signed(summary.trend) : '–'],
      ['Participation', participation !== null ? formatPercent(participation) : '–'],
    ]
    // Bande d'indicateurs d'un seul tenant, comme dans la console
    slide.addShape('roundRect', { x: X, y: 1.4, w: CONTENT_W, h: 1.6, rectRadius: 0.1, fill: { color: PALE }, line: { color: PALE, width: 0 } })
    const cellW = CONTENT_W / kpis.length
    kpis.forEach(([label, value], i) => {
      const x = X + i * cellW
      if (i > 0) slide.addShape('line', { x, y: 1.6, w: 0, h: 1.2, line: { color: RULE, width: 0.75 } })
      slide.addText(label, { x: x + 0.3, y: 1.55, w: cellW - 0.5, h: 0.4, fontFace: FONT, fontSize: 13, color: MUTED })
      const bad = i === 2 && summary.trend !== null && summary.trend <= -0.3
      slide.addText(value, { x: x + 0.3, y: 1.95, w: cellW - 0.5, h: 0.8, fontFace: FONT, fontSize: 30, bold: true, color: bad ? RED : NAVY })
    })

    const alert = alertMessage(summary)
    slide.addShape('roundRect', {
      x: X, y: 3.3, w: CONTENT_W, h: 1.1, rectRadius: 0.1,
      fill: { color: alert ? AMBER_BG : MINT }, line: { color: alert ? AMBER_LINE : SAGE, width: 1 },
    })
    slide.addText(alert ? `À surveiller : ${alert}` : 'Rien d\'alarmant sur les 7 derniers jours.', {
      x: X + 0.3, y: 3.35, w: CONTENT_W - 0.6, h: 1.0, fontFace: FONT, fontSize: 18, bold: true, color: NAVY, valign: 'middle', fit: 'shrink',
    })

    const lines = [`${summary.responses} réponses anonymes sur la période.`]
    if (summary.topTag) lines.push(`Sujet le plus cité ces 7 derniers jours : ${summary.topTag}.`)
    if (data.teams) lines.push(`${data.teams.filter(isWatched).length} équipe(s) à surveiller sur ${data.teams.length}.`)
    lines.push(`${data.actions.length} action(s) publiée(s) par les managers sur la période.`)
    bullets(slide, lines, { x: X, y: 4.65, w: CONTENT_W, h: 2.0 })

    note(slide, [
      summary.avg30 !== null
        ? `Le moral moyen est de ${formatDecimal(summary.avg30)} sur 5 sur les ${days} derniers jours${summary.last7 !== null ? `, et de ${formatDecimal(summary.last7)} sur les 7 derniers` : ''}.`
        : 'Pas assez de réponses sur la période pour calculer une moyenne sans risque pour l\'anonymat.',
      summary.trend !== null ? `Tendance : ${signed(summary.trend)} point par rapport aux 7 jours précédents.` : '',
      alert ? `Point d'attention à souligner : ${alert}` : 'Aucune alerte : l\'occasion de souligner ce qui fonctionne.',
      'Participation = réponses par jour rapportées au nombre d\'employés. Plus elle est haute, plus les chiffres sont fiables.',
    ])
  }

  /** La courbe du moral (jours masqués = trous). */
  const addChart = () => {
    const slide = newSlide('Évolution du moral moyen', 'Note de 1 (très mal) à 5 (très bien), journées closes uniquement')
    const long = stats.length > 45
    slide.addChart('line', [{
      name: 'Moral moyen',
      labels: stats.map((d) => `${d.jour.slice(8)}/${d.jour.slice(5, 7)}`),
      // Jours masqués (moins de 3 réponses) : valeur vide => trou dans la courbe
      values: stats.map((d) => d.moyenne) as number[],
    }], {
      x: X, y: 1.55, w: CONTENT_W, h: 4.75,
      chartColors: [TEAL], lineSize: 3,
      lineDataSymbol: long ? 'none' : 'circle', lineDataSymbolSize: 6,
      displayBlanksAs: 'gap', showLegend: false,
      valAxisMinVal: 1, valAxisMaxVal: 5, valAxisMajorUnit: 1,
      catAxisLabelFrequency: String(Math.ceil(stats.length / 10)),
      catAxisLabelColor: MUTED, valAxisLabelColor: MUTED, catAxisLabelFontSize: 11, valAxisLabelFontSize: 11,
      catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
      valGridLine: { color: PALE, style: 'solid', size: 1 }, catGridLine: { style: 'none' },
    })
    slide.addText(`Les trous = jours avec moins de ${ANONYMITY_THRESHOLD} réponses, masqués pour protéger l'anonymat.`, {
      x: X, y: 6.35, w: CONTENT_W, h: 0.4, fontFace: FONT, fontSize: 12, color: MUTED,
    })
    const hidden = stats.filter((d) => d.moyenne === null).length
    note(slide, [
      'Lire la courbe de gauche à droite : chaque point est la moyenne d\'une journée.',
      hidden > 0 ? `${hidden} jour(s) sur ${stats.length} sont masqués (moins de ${ANONYMITY_THRESHOLD} réponses, souvent les week-ends) : c'est voulu.` : '',
      'Chercher les creux et les remontées, et se demander ce qui s\'est passé à ces dates (charge, événement, annonce).',
    ])
  }

  const addTeams = () => {
    if (!data.teams || data.teams.length === 0) return
    const slide = newSlide('Équipes à surveiller', '7 derniers jours clos, comparés aux 7 jours d\'avant')
    const sorted = [...data.teams].sort((a, b) => Number(isWatched(b)) - Number(isWatched(a)) || (trendOf(a) ?? 9) - (trendOf(b) ?? 9))
    const rows = sorted.map((t) => {
      const trend = trendOf(t)
      const watched = isWatched(t)
      return [
        t.nom,
        String(t.nb_membres),
        t.nb_reponses_7j !== null ? String(t.nb_reponses_7j) : 'masqué',
        t.moyenne_7j !== null ? formatDecimal(t.moyenne_7j) : 'masquée',
        trend !== null ? signed(trend) : '–',
        t.sujet ?? '–',
        watched ? 'À surveiller' : t.masquee ? 'Moins de 3 pers.' : t.moyenne_7j === null ? 'Peu de réponses' : 'OK',
      ].map((text) => ({ text, options: watched ? { fill: { color: AMBER_BG } } : {} }))
    })
    table(slide, ['Équipe', 'Membres', 'Réponses 7 j', 'Moyenne 7 j', 'Tendance', 'Sujet n°1', 'Statut'], rows, {
      y: 1.6, colW: [2.7, 1.1, 1.5, 1.5, 1.3, 2.3, 1.73],
    })
    const watched = sorted.filter(isWatched)
    note(slide, [
      watched.length > 0
        ? `${watched.length} équipe(s) à surveiller : ${watched.map((t) => t.nom).join(', ')}.`
        : 'Aucune équipe à surveiller sur les 7 derniers jours.',
      'Une équipe est « à surveiller » si sa moyenne passe sous 2,75 ou baisse d\'au moins 0,3 point en une semaine.',
      'Les équipes de moins de 3 employés sont toujours masquées : ce n\'est pas un manque de données mais une protection.',
    ])
  }

  /** Graphique en barres : part des réponses qui citent chaque sujet, cette période vs la précédente. */
  const addTopicsChart = () => {
    const shown = topics.filter((t) => t.nb > 0 || t.nb_precedent > 0).slice(0, 7)
    const total = shown[0]?.total_reponses ?? 0
    const totalPrev = shown[0]?.total_precedent ?? 0
    const slide = newSlide('Sujets cités', `Part des réponses qui citent chaque sujet : ${days} derniers jours${totalPrev > 0 ? ` vs les ${days} jours d'avant` : ''}`)
    if (shown.length === 0 || total === 0) {
      bullets(slide, ['Pas assez de réponses sur la période pour afficher les sujets sans risque pour l\'anonymat.'], { x: X, y: 1.8, w: CONTENT_W, h: 1.5 })
      note(slide, ['Pas de sujet affichable : encourager la participation pour la prochaine période.'])
      return
    }
    // Barres horizontales : PowerPoint les empile de bas en haut, on inverse pour avoir le n°1 en haut
    const ordered = [...shown].reverse()
    const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0)
    const labels = ordered.map((t) => t.tag)
    const series = [{ name: `${days} derniers jours`, labels, values: ordered.map((t) => pct(t.nb, total)) }]
    if (totalPrev > 0) series.unshift({ name: 'Période précédente', labels, values: ordered.map((t) => pct(t.nb_precedent, totalPrev)) })
    slide.addChart('bar', series, {
      x: X, y: 1.6, w: CONTENT_W, h: 5.1,
      barDir: 'bar', barGrouping: 'clustered', barGapWidthPct: 60,
      chartColors: totalPrev > 0 ? [RULE, TEAL] : [TEAL],
      showLegend: totalPrev > 0, legendPos: 't', legendFontFace: FONT, legendFontSize: 12, legendColor: MUTED,
      showValue: true, dataLabelFormatCode: '0" %"', dataLabelColor: NAVY, dataLabelFontSize: 11, dataLabelFontFace: FONT, dataLabelPosition: 'outEnd',
      valAxisHidden: true, valAxisMinVal: 0, valGridLine: { style: 'none' },
      catAxisLabelColor: NAVY, catAxisLabelFontSize: 13, catAxisLabelFontFace: FONT, catAxisLineShow: false,
    })
    const rising = shown.filter((t) => totalPrev > 0 && pct(t.nb, total) - pct(t.nb_precedent, totalPrev) >= 5)
    note(slide, [
      `Sujet le plus cité : ${shown[0].tag}, dans ${pct(shown[0].nb, total)} % des réponses.`,
      rising.length > 0 ? `En nette hausse (5 points ou plus) : ${rising.map((t) => t.tag).join(', ')}.` : '',
      `Seules les journées d'au moins ${ANONYMITY_THRESHOLD} réponses sont comptées.`,
    ])
  }

  /** Version équipe : les 3 sujets en grandes cartes, sans comparaison ni pistes. */
  const addTeamTopics = () => {
    const slide = newSlide('Ce qui revient le plus')
    if (topTopics.length === 0) {
      bullets(slide, ['Pas assez de réponses sur la période pour dégager des sujets, sans risque pour l\'anonymat.'], { x: X, y: 1.6, w: CONTENT_W, h: 2 })
      return
    }
    topTopics.forEach((t, i) => {
      const y = 1.5 + i * 1.65
      slide.addShape('roundRect', { x: X, y, w: CONTENT_W, h: 1.4, rectRadius: 0.1, fill: { color: i === 0 ? MINT : PALE }, line: { color: i === 0 ? MINT : PALE, width: 0 } })
      slide.addText(`${i + 1}. ${t.tag}`, { x: X + 0.3, y: y + 0.15, w: 8, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color: NAVY })
      const share = t.total_reponses > 0 ? formatPercent(t.nb / t.total_reponses) : '–'
      slide.addText(`Cité dans ${share} des réponses de l'équipe`, { x: X + 0.3, y: y + 0.8, w: 11, h: 0.45, fontFace: FONT, fontSize: 14, color: MUTED })
    })
    note(slide, ['Demander à l\'équipe si ces sujets lui parlent, et ce qui se cache derrière, sans chercher qui les a cités.'])
  }

  const addProblems = () => {
    if (topTopics.length === 0) {
      const slide = newSlide('Problèmes principaux')
      bullets(slide, ['Aucun sujet récurrent sur la période, ou pas assez de réponses pour l\'afficher sans risque pour l\'anonymat.'], { x: X, y: 1.6, w: CONTENT_W, h: 2 })
      note(slide, ['Rien de saillant : c\'est le moment de demander aux équipes ce qui pourrait encore s\'améliorer.'])
      return
    }
    topTopics.forEach((t, i) => {
      const slide = newSlide(`Problème n°${i + 1} : ${t.tag}`)
      const share = t.total_reponses > 0 ? formatPercent(t.nb / t.total_reponses) : '–'
      const evolution = t.nb_precedent === 0
        ? 'Nouveau sujet par rapport à la période précédente.'
        : `${t.nb >= t.nb_precedent ? 'En hausse' : 'En baisse'} : ${t.nb_precedent} → ${t.nb} mentions par rapport aux ${days} jours d'avant.`
      const related = data.actions.filter((a) => a.tag === t.tag)

      slide.addText(share, { x: X, y: 1.35, w: 5.8, h: 1.0, fontFace: FONT, fontSize: 48, bold: true, color: TEAL_DARK })
      slide.addText('des réponses citent ce sujet', { x: X, y: 2.3, w: 5.8, h: 0.4, fontFace: FONT, fontSize: 14, color: MUTED })
      bullets(slide, [
        `Cité ${t.nb} fois sur ${t.total_reponses} réponses.`,
        evolution,
        related.length > 0 ? `${related.length} action(s) déjà publiée(s) sur ce sujet.` : 'Aucune action publiée sur ce sujet pour l\'instant.',
      ], { x: X, y: 3.0, w: 5.8, h: 3.6 })

      slide.addShape('roundRect', { x: 6.8, y: 1.35, w: 5.93, h: 5.3, rectRadius: 0.1, fill: { color: PALE }, line: { color: PALE, width: 0 } })
      slide.addText('Pistes d\'action', { x: 7.1, y: 1.5, w: 5.4, h: 0.5, fontFace: FONT, fontSize: 18, bold: true, color: TEAL_DARK })
      bullets(slide, suggestionsFor(t.tag), { x: 7.1, y: 2.1, w: 5.4, h: 4.3 })

      note(slide, [
        `${t.tag} revient dans ${share} des réponses. ${evolution}`,
        related.length > 0
          ? `Déjà fait ou en cours : ${related.map((a) => `${a.message} (${statusText(a)})`).join(' ; ')}.`
          : 'Rien n\'a encore été publié sur ce sujet : c\'est une priorité.',
        'Les pistes sont génériques : choisir avec l\'équipe celle qui a le plus de sens, plutôt que de tout lancer.',
      ])
    })
  }

  const addActions = () => {
    const title = audience === 'equipe' ? 'Nos actions et vos avis' : 'Ce qui a déjà été mis en place'
    const slide = newSlide(title, data.actions.length > 0 ? `${data.actions.length} action(s) publiée(s) sur la période` : undefined)
    if (data.actions.length === 0) {
      bullets(slide, [
        'Aucune action publiée sur la période.',
        ...(audience === 'direction' ? ['Recommandation : publier au moins une action par problème identifié, pour montrer aux équipes que leurs retours sont entendus.'] : []),
      ], { x: X, y: 1.6, w: CONTENT_W, h: 3 })
      note(slide, ['Sans action visible, la participation baisse : les équipes ont besoin de voir que leurs réponses servent.'])
      return
    }
    if (audience === 'equipe') {
      const rows = data.actions.map((a) => [{ text: a.message }, { text: statusText(a) }, { text: feedbackText(a.id) }])
      table(slide, ['Action', 'Statut', 'Votre avis (anonyme)'], rows, { y: 1.6, colW: [7.2, 2.4, 2.53], fontSize: 13 })
    } else {
      const rows = data.actions.map((a) => [
        { text: frDate(a.created_at.slice(0, 10)) },
        { text: a.tag ?? '–' },
        { text: a.message },
        { text: statusText(a) },
        { text: feedbackText(a.id) },
      ])
      table(slide, ['Date', 'Sujet', 'Action', 'Statut', 'Avis'], rows, { y: 1.6, colW: [1.2, 2.0, 5.3, 1.7, 1.93] })
    }
    const done = data.actions.filter((a) => a.status === 'faite').length
    const today = localISO()
    const late = data.actions.filter((a) => a.status !== 'faite' && a.due_date && a.due_date < today).length
    note(slide, [
      `${done} action(s) terminée(s) sur ${data.actions.length}.`,
      late > 0 ? `${late} action(s) ont dépassé leur échéance : à replanifier ou à expliquer.` : '',
      'Les avis « utile / insuffisant » sont anonymes et ne sont détaillés qu\'à partir de 3 votes.',
    ])
  }

  const addQuestionnaires = () => {
    const total = anonymousTotal(data.anonymous)
    if (total < ANONYMITY_THRESHOLD) return
    const slide = newSlide('Ce que disent les questionnaires anonymes', `${total} questionnaires remplis après une mauvaise humeur`)
    const rows = REPORT_QUESTIONS.flatMap((q, qi) => {
      const best = data.anonymous.filter((r) => r.question === qi + 1).sort((a, b) => b.nb - a.nb)[0]
      return best ? [[{ text: q.label }, { text: reportChoiceLabel(qi, best.answer) }, { text: formatPercent(best.nb / total) }]] : []
    })
    table(slide, ['Question', 'Réponse la plus fréquente', 'Part'], rows, { y: 1.6, colW: [5.2, 5.2, 1.73], fontSize: 14, margin: 0.1 })
    note(slide, [
      'Ces questionnaires ne sont proposés qu\'après une humeur de 1 ou 2 : ils décrivent les journées difficiles, pas l\'ensemble de l\'équipe.',
      'Ils sont entièrement anonymes, sans note ni date exacte.',
    ])
  }

  /** Direction : une ligne par problème, à compléter en réunion. Équipe : actions en cours ou propositions. */
  const addNext = () => {
    if (audience === 'equipe') {
      const slide = newSlide('Ce qu\'on va faire ensuite')
      const next = data.actions.filter((a) => a.status !== 'faite')
      const lines = next.length > 0
        ? next.slice(0, 6).map((a) => `${a.message} (${statusText(a)})`)
        : suggestionsFor(topTopics[0]?.tag).map((s) => `Proposition : ${s}`)
      bullets(slide, lines, { x: X, y: 1.5, w: CONTENT_W, h: 5 })
      note(slide, [
        next.length > 0
          ? 'Présenter les actions en cours et leur échéance, puis demander si elles répondent au bon problème.'
          : 'Aucune action en cours : présenter ces propositions comme des pistes à choisir ensemble.',
      ])
      return
    }
    const slide = newSlide('Décisions à prendre', 'À compléter pendant la réunion')
    const subjects = topTopics.length > 0 ? topTopics.map((t) => t.tag) : ['Sujet à définir']
    const rows: PptxGenJS.TableRow[] = subjects.map((tag) => [{ text: tag, options: { bold: true } }, { text: '' }, { text: '' }, { text: '' }])
    slide.addTable([headerRow(['Sujet', 'Action retenue', 'Responsable', 'Échéance']), ...rows], {
      x: X, y: 1.6, w: CONTENT_W, colW: [2.8, 5.2, 2.2, 1.93], rowH: [0.5, ...rows.map(() => 1.1)],
      fontFace: FONT, fontSize: 14, color: NAVY, valign: 'middle', border: { type: 'solid', color: RULE, pt: 0.75 }, margin: 0.12,
    })
    slide.addText('Une fois décidées, les actions se publient dans WorkZen (console, page « Actions ») : les équipes les voient et donnent leur avis anonyme.', {
      x: X, y: 6.15, w: CONTENT_W, h: 0.5, fontFace: FONT, fontSize: 12, color: MUTED,
    })
    note(slide, [
      'Pour chaque sujet : une seule action, un responsable nommé, une date. Mieux vaut une action tenue que trois annoncées.',
      ...topTopics.map((t) => `${t.tag} : par exemple « ${suggestionsFor(t.tag)[0]} ».`),
    ])
  }

  const addFloor = () => {
    const slide = newSlide('À vous la parole')
    bullets(slide, [
      'Qu\'est-ce qui vous surprend dans ces résultats ?',
      'Parmi les actions en cours, laquelle compte le plus pour vous ?',
      'Qu\'est-ce qui vous aiderait concrètement le mois prochain ?',
      'Qu\'est-ce qu\'on arrête, qu\'on continue, qu\'on commence ?',
    ], { x: X, y: 1.5, w: CONTENT_W, h: 4.4, fontSize: 20 })
    slide.addText('Rappel : les réponses dans WorkZen restent anonymes, ici comme dans l\'app.', {
      x: X, y: 6.2, w: CONTENT_W, h: 0.5, fontFace: FONT, fontSize: 12, color: MUTED,
    })
    note(slide, [
      'Laisser du silence après chaque question. Ne jamais demander qui a répondu quoi.',
      'Noter les idées, puis les transformer en actions publiées dans WorkZen.',
    ])
  }

  const addMethod = () => {
    const slide = newSlide('Méthode et anonymat')
    bullets(slide, [
      'Chaque employé donne son humeur du jour (de 1 à 5) et jusqu\'à 3 sujets. Aucune humeur n\'est reliée à une personne, même en base de données.',
      `Une moyenne n'est affichée que pour les journées d'au moins ${ANONYMITY_THRESHOLD} réponses ; la journée en cours n'est jamais incluse.`,
      'Les sujets et tendances ne comptent que les journées affichables. Les questionnaires anonymes ne sont présentés qu\'à partir de 3.',
      'Ce document ne contient aucun rapport nominatif ni aucune donnée individuelle.',
      'Les pistes d\'action sont des suggestions génériques, à adapter avec les équipes.',
    ], { x: X, y: 1.5, w: CONTENT_W, h: 5.1 })
    note(slide, ['Diapositive de référence, à garder en annexe si le temps manque.'])
  }

  const builders: Record<SectionId, () => void> = {
    synthese: addSynthesis,
    courbe: addChart,
    equipes: addTeams,
    sujets: audience === 'equipe' ? addTeamTopics : addTopicsChart,
    problemes: addProblems,
    actions: addActions,
    questionnaires: addQuestionnaires,
    suite: addNext,
    parole: addFloor,
    methode: addMethod,
  }

  addTitle()
  for (const s of SECTIONS[audience]) {
    if (options.sections.includes(s.id)) builders[s.id]()
  }

  const suffix = audience === 'equipe' ? '-equipe' : ''
  await pptx.writeFile({ fileName: `workzen-${slugify(scope.nom)}${suffix}-${days}j-${localISO()}.pptx` })
  return count
}
