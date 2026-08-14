import os
import re

workspace_dir = '/Volumes/My SSD/Native App/my-test-app/src/app'

# 1. Update dues.tsx
dues_path = os.path.join(workspace_dir, 'dues.tsx')
if os.path.exists(dues_path):
    with open(dues_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # Import
    content = content.replace(
        "import { useLanguage } from '@/context/LanguageContext';",
        "import { useLanguage } from '@/context/LanguageContext';\nimport { formatNumber, getCurrencySymbol, toBanglaDigits } from '@/utils/number';"
    )

    # Remove local helper
    content = content.replace(
        "const formatNum = (num: number) => {\n  return num.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');\n};",
        ""
    )

    # Regex whole-word replacement of formatNum -> formatNumber
    content = re.sub(r'\bformatNum\b', 'formatNumber', content)

    # Replace currency prefixes
    content = content.replace("TK {formatNumber", "{getCurrencySymbol()}{formatNumber")
    content = content.replace('"+ TK "', '"+" + getCurrencySymbol()')
    content = content.replace('"- TK "', '"-" + getCurrencySymbol()')

    with open(dues_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Localized dues.tsx")

# 2. Update explore.tsx
explore_path = os.path.join(workspace_dir, 'explore.tsx')
if os.path.exists(explore_path):
    with open(explore_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # Import
    content = content.replace(
        "import { useLanguage } from '@/context/LanguageContext';",
        "import { useLanguage } from '@/context/LanguageContext';\nimport { formatNumber, getCurrencySymbol, toBanglaDigits } from '@/utils/number';"
    )

    # Remove local helper
    content = content.replace(
        "const formatNum = (n: number) => {\n  const parts = n.toString().split('.');\n  parts[0] = parts[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');\n  return parts.join('.');\n};",
        ""
    )

    # Regex whole-word replacement of formatNum -> formatNumber
    content = re.sub(r'\bformatNum\b', 'formatNumber', content)

    # Replace currency prefixes
    content = content.replace("TK {formatNumber", "{getCurrencySymbol()}{formatNumber")
    content = content.replace("`TK ${formatNumber", "`${getCurrencySymbol()}${formatNumber")
    content = content.replace("TK\n", "{getCurrencySymbol()}\n")
    content = content.replace("TK </Text>", "{getCurrencySymbol()}</Text>")
    content = content.replace("style={[styles.heroTK, { color: theme.text }]}>TK", "style={[styles.heroTK, { color: theme.text }]}>{getCurrencySymbol()}")
    content = content.replace("style={[styles.modalInputPrefix, { color: category.color }]}>TK", "style={[styles.modalInputPrefix, { color: category.color }]}>{getCurrencySymbol().trim()}")

    with open(explore_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Localized explore.tsx")

# 3. Update stats.tsx
stats_path = os.path.join(workspace_dir, 'stats.tsx')
if os.path.exists(stats_path):
    with open(stats_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # Import
    content = content.replace(
        "import { translations } from '@/constants/translations';",
        "import { translations } from '@/constants/translations';\nimport { formatNumber, getCurrencySymbol, toBanglaDigits } from '@/utils/number';"
    )

    # Remove local helper
    content = content.replace(
        "const formatNumber = (num: number) => {\n  const parts = num.toString().split('.');\n  parts[0] = parts[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');\n  return parts.join('.');\n};",
        ""
    )

    # Replace currency prefixes
    content = content.replace("TK {formatNumber", "{getCurrencySymbol()}{formatNumber")
    content = content.replace("style={styles.heroTK}>TK", "style={styles.heroTK}>{getCurrencySymbol().trim()}")
    content = content.replace("style={[styles.catTK, { color: theme.textSecondary }]}>TK </Text>", "style={[styles.catTK, { color: theme.textSecondary }]}>{getCurrencySymbol()}</Text>")

    with open(stats_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Localized stats.tsx")

# 4. Update report.tsx
report_path = os.path.join(workspace_dir, 'report.tsx')
if os.path.exists(report_path):
    with open(report_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # Import
    content = content.replace(
        "import { useAuth } from '@/context/AuthContext';",
        "import { useAuth } from '@/context/AuthContext';\nimport { formatNumber, getCurrencySymbol, toBanglaDigits } from '@/utils/number';"
    )

    # Remove local helper
    content = content.replace(
        "const formatNumber = (num: number) => {\n  const parts = num.toString().split('.');\n  parts[0] = parts[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');\n  return parts.join('.');\n};",
        ""
    )

    # Replace currency prefixes
    content = content.replace("TK {formatNumber", "{getCurrencySymbol()}{formatNumber")
    content = content.replace("style={styles.heroTK}>TK </Text>", "style={styles.heroTK}>{getCurrencySymbol()}</Text>")
    content = content.replace("income}: TK {formatNumber", "income}: {getCurrencySymbol()}{formatNumber")
    content = content.replace("expense}: TK {formatNumber", "expense}: {getCurrencySymbol()}{formatNumber")
    content = content.replace("+TK {formatNumber", "+{getCurrencySymbol()}{formatNumber")
    content = content.replace("-TK {formatNumber", "-{getCurrencySymbol()}{formatNumber")
    content = content.replace("'+' : '-'} TK {formatNumber", "'+' : '-'} {getCurrencySymbol()}{formatNumber")

    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Localized report.tsx")

# 5. Update profile.tsx
profile_path = os.path.join(workspace_dir, 'profile.tsx')
if os.path.exists(profile_path):
    with open(profile_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # Import
    content = content.replace(
        "import { useNotificationBanner } from '@/context/NotificationBannerContext';",
        "import { useNotificationBanner } from '@/context/NotificationBannerContext';\nimport { formatNumber, getCurrencySymbol, toBanglaDigits } from '@/utils/number';"
    )

    # Replace toLocaleString
    content = content.replace("TK {totalBalance.toLocaleString('en-US')}", "{getCurrencySymbol()}{formatNumber(totalBalance)}")
    content = content.replace("TK {totalIncome.toLocaleString('en-US')}", "{getCurrencySymbol()}{formatNumber(totalIncome)}")
    content = content.replace("TK {totalExpenses.toLocaleString('en-US')}", "{getCurrencySymbol()}{formatNumber(totalExpenses)}")

    # Group counts
    content = content.replace("{transactions.length}", "{language === 'bn' ? toBanglaDigits(transactions.length.toString()) : transactions.length}")
    
    # Points counts
    content = content.replace(
        "t.rewardPointsLabel.replace('{points}', points.toString())",
        "t.rewardPointsLabel.replace('{points}', language === 'bn' ? toBanglaDigits(points.toString()) : points.toString())"
    )
    content = content.replace(
        "⭐ {points} {t.pointsPillLabel}",
        "⭐ {language === 'bn' ? toBanglaDigits(points.toString()) : points} {t.pointsPillLabel}"
    )

    with open(profile_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Localized profile.tsx")

# 6. Update index.tsx count bindings
index_path = os.path.join(workspace_dir, 'index.tsx')
if os.path.exists(index_path):
    with open(index_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # Add dynamic count translations to ledger counters
    content = content.replace(
        "{transactions.length} {language === 'bn' ? 'টি লেনদেন' : 'transactions'}",
        "{language === 'bn' ? toBanglaDigits(transactions.length.toString()) : transactions.length} {language === 'bn' ? 'টি লেনদেন' : 'transactions'}"
    )
    content = content.replace(
        "{notifications.filter(n => !n.isRead).length}",
        "{language === 'bn' ? toBanglaDigits(notifications.filter(n => !n.isRead).length.toString()) : notifications.filter(n => !n.isRead).length}"
    )
    # Categories counts
    content = content.replace(
        "({transactions.length})",
        "({language === 'bn' ? toBanglaDigits(transactions.length.toString()) : transactions.length})"
    )
    content = content.replace(
        "({count})",
        "({language === 'bn' ? toBanglaDigits(count.toString()) : count})"
    )

    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Localized index.tsx counters")
