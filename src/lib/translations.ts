type TranslationKey = string;
type Translations = Record<string, Record<TranslationKey, string>>;

export const translations: Translations = {
  es: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.investments': 'Inversiones',
    'nav.profile': 'Perfil',
    'nav.logout': 'Cerrar sesión',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Resumen de tus finanzas personales',
    'dashboard.income': 'Ingresos',
    'dashboard.expenses': 'Gastos',
    'dashboard.balance': 'Balance',
    'dashboard.savings_rate': 'Tasa de Ahorro',
    'dashboard.vs_last_month': 'vs mes anterior',
    'dashboard.no_data': 'Sin datos',
    'dashboard.upload_prompt': 'Sube tus extractos bancarios para empezar a analizar tus finanzas',
    'dashboard.go_to_profile': 'Ir a Perfil para subir',
    
    // Investments
    'investments.title': 'Inversiones',
    'investments.subtitle': 'Seguimiento de tu cartera de inversiones',
    'investments.this_month': 'Este Mes',
    'investments.total_invested': 'Total Invertido',
    'investments.current_value': 'Valor Actual',
    'investments.platforms': 'Plataformas',
    'investments.by_platform': 'Por Plataforma',
    'investments.by_asset_type': 'Por Tipo de Activo',
    'investments.history': 'Historial',
    'investments.recent_movements': 'Movimientos Recientes',
    'investments.no_data': 'Sin datos de inversiones',
    'investments.upload_prompt': 'Sube tus extractos de inversión o añade cuentas manualmente',
    
    // Transactions
    'transactions.date': 'Fecha',
    'transactions.description': 'Descripción',
    'transactions.category': 'Categoría',
    'transactions.amount': 'Importe',
    'transactions.bank': 'Banco',
    'transactions.type': 'Tipo',
    'transactions.deposit': 'Depósito',
    'transactions.withdrawal': 'Retiro',
    
    // Categories
    'category.food': 'Alimentación',
    'category.transport': 'Transporte',
    'category.entertainment': 'Ocio',
    'category.utilities': 'Servicios',
    'category.shopping': 'Compras',
    'category.health': 'Salud',
    'category.education': 'Educación',
    'category.other': 'Otros',
    
    // Asset types
    'asset.stocks': 'Acciones',
    'asset.etf': 'ETFs',
    'asset.bonds': 'Bonos',
    'asset.commodities': 'Materias Primas',
    'asset.crypto': 'Cripto',
    'asset.savings': 'Ahorro',
    'asset.unclassified': 'Sin clasificar',
    
    // Profile
    'profile.title': 'Perfil',
    'profile.uploads': 'Subidas',
    'profile.preferences': 'Preferencias',
    'profile.regional_settings': 'Configuración Regional',
    'profile.language': 'Idioma',
    'profile.currency': 'Moneda base',
    'profile.date_format': 'Formato de fecha',
    'profile.save_preferences': 'Guardar preferencias',
    'profile.preferences_saved': 'Preferencias guardadas',
    
    // Common
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.add': 'Añadir',
    'common.confirm': 'Confirmar',
    'common.load_more': 'Cargar más',
    
    // Months
    'month.january': 'Enero',
    'month.february': 'Febrero',
    'month.march': 'Marzo',
    'month.april': 'Abril',
    'month.may': 'Mayo',
    'month.june': 'Junio',
    'month.july': 'Julio',
    'month.august': 'Agosto',
    'month.september': 'Septiembre',
    'month.october': 'Octubre',
    'month.november': 'Noviembre',
    'month.december': 'Diciembre',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.investments': 'Investments',
    'nav.profile': 'Profile',
    'nav.logout': 'Log out',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Overview of your personal finances',
    'dashboard.income': 'Income',
    'dashboard.expenses': 'Expenses',
    'dashboard.balance': 'Balance',
    'dashboard.savings_rate': 'Savings Rate',
    'dashboard.vs_last_month': 'vs last month',
    'dashboard.no_data': 'No data',
    'dashboard.upload_prompt': 'Upload your bank statements to start analyzing your finances',
    'dashboard.go_to_profile': 'Go to Profile to upload',
    
    // Investments
    'investments.title': 'Investments',
    'investments.subtitle': 'Track your investment portfolio',
    'investments.this_month': 'This Month',
    'investments.total_invested': 'Total Invested',
    'investments.current_value': 'Current Value',
    'investments.platforms': 'Platforms',
    'investments.by_platform': 'By Platform',
    'investments.by_asset_type': 'By Asset Type',
    'investments.history': 'History',
    'investments.recent_movements': 'Recent Movements',
    'investments.no_data': 'No investment data',
    'investments.upload_prompt': 'Upload your investment statements or add accounts manually',
    
    // Transactions
    'transactions.date': 'Date',
    'transactions.description': 'Description',
    'transactions.category': 'Category',
    'transactions.amount': 'Amount',
    'transactions.bank': 'Bank',
    'transactions.type': 'Type',
    'transactions.deposit': 'Deposit',
    'transactions.withdrawal': 'Withdrawal',
    
    // Categories
    'category.food': 'Food',
    'category.transport': 'Transport',
    'category.entertainment': 'Entertainment',
    'category.utilities': 'Utilities',
    'category.shopping': 'Shopping',
    'category.health': 'Health',
    'category.education': 'Education',
    'category.other': 'Other',
    
    // Asset types
    'asset.stocks': 'Stocks',
    'asset.etf': 'ETFs',
    'asset.bonds': 'Bonds',
    'asset.commodities': 'Commodities',
    'asset.crypto': 'Crypto',
    'asset.savings': 'Savings',
    'asset.unclassified': 'Unclassified',
    
    // Profile
    'profile.title': 'Profile',
    'profile.uploads': 'Uploads',
    'profile.preferences': 'Preferences',
    'profile.regional_settings': 'Regional Settings',
    'profile.language': 'Language',
    'profile.currency': 'Base currency',
    'profile.date_format': 'Date format',
    'profile.save_preferences': 'Save preferences',
    'profile.preferences_saved': 'Preferences saved',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.confirm': 'Confirm',
    'common.load_more': 'Load more',
    
    // Months
    'month.january': 'January',
    'month.february': 'February',
    'month.march': 'March',
    'month.april': 'April',
    'month.may': 'May',
    'month.june': 'June',
    'month.july': 'July',
    'month.august': 'August',
    'month.september': 'September',
    'month.october': 'October',
    'month.november': 'November',
    'month.december': 'December',
  },
  pt: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.investments': 'Investimentos',
    'nav.profile': 'Perfil',
    'nav.logout': 'Sair',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Resumo das suas finanças pessoais',
    'dashboard.income': 'Receitas',
    'dashboard.expenses': 'Despesas',
    'dashboard.balance': 'Saldo',
    'dashboard.savings_rate': 'Taxa de Poupança',
    'dashboard.vs_last_month': 'vs mês anterior',
    'dashboard.no_data': 'Sem dados',
    'dashboard.upload_prompt': 'Envie seus extratos bancários para começar a analisar suas finanças',
    'dashboard.go_to_profile': 'Ir ao Perfil para enviar',
    
    // Investments
    'investments.title': 'Investimentos',
    'investments.subtitle': 'Acompanhe sua carteira de investimentos',
    'investments.this_month': 'Este Mês',
    'investments.total_invested': 'Total Investido',
    'investments.current_value': 'Valor Atual',
    'investments.platforms': 'Plataformas',
    'investments.by_platform': 'Por Plataforma',
    'investments.by_asset_type': 'Por Tipo de Ativo',
    'investments.history': 'Histórico',
    'investments.recent_movements': 'Movimentos Recentes',
    'investments.no_data': 'Sem dados de investimentos',
    'investments.upload_prompt': 'Envie seus extratos de investimento ou adicione contas manualmente',
    
    // Transactions
    'transactions.date': 'Data',
    'transactions.description': 'Descrição',
    'transactions.category': 'Categoria',
    'transactions.amount': 'Valor',
    'transactions.bank': 'Banco',
    'transactions.type': 'Tipo',
    'transactions.deposit': 'Depósito',
    'transactions.withdrawal': 'Saque',
    
    // Categories
    'category.food': 'Alimentação',
    'category.transport': 'Transporte',
    'category.entertainment': 'Lazer',
    'category.utilities': 'Serviços',
    'category.shopping': 'Compras',
    'category.health': 'Saúde',
    'category.education': 'Educação',
    'category.other': 'Outros',
    
    // Asset types
    'asset.stocks': 'Ações',
    'asset.etf': 'ETFs',
    'asset.bonds': 'Títulos',
    'asset.commodities': 'Commodities',
    'asset.crypto': 'Cripto',
    'asset.savings': 'Poupança',
    'asset.unclassified': 'Não classificado',
    
    // Profile
    'profile.title': 'Perfil',
    'profile.uploads': 'Uploads',
    'profile.preferences': 'Preferências',
    'profile.regional_settings': 'Configurações Regionais',
    'profile.language': 'Idioma',
    'profile.currency': 'Moeda base',
    'profile.date_format': 'Formato de data',
    'profile.save_preferences': 'Salvar preferências',
    'profile.preferences_saved': 'Preferências salvas',
    
    // Common
    'common.loading': 'Carregando...',
    'common.error': 'Erro',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.add': 'Adicionar',
    'common.confirm': 'Confirmar',
    'common.load_more': 'Carregar mais',
    
    // Months
    'month.january': 'Janeiro',
    'month.february': 'Fevereiro',
    'month.march': 'Março',
    'month.april': 'Abril',
    'month.may': 'Maio',
    'month.june': 'Junho',
    'month.july': 'Julho',
    'month.august': 'Agosto',
    'month.september': 'Setembro',
    'month.october': 'Outubro',
    'month.november': 'Novembro',
    'month.december': 'Dezembro',
  },
};

export function getTranslation(language: string, key: string): string {
  const lang = translations[language] || translations['es'];
  return lang[key] || key;
}
