#!/bin/bash

#############################################
# n8n Cursor MCP Server - Kurulum Script'i
#############################################

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logo
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║     n8n Cursor MCP Server Kurulumu        ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Fonksiyonlar
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Script'in bulunduğu dizin
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 1. Node.js kontrolü
echo ""
print_info "Node.js kontrolü yapılıyor..."
if ! command -v node &> /dev/null; then
    print_error "Node.js bulunamadı!"
    echo "Lütfen Node.js 18+ yükleyin: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ gerekli. Mevcut: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) bulundu"

# 2. Yarn/npm kontrolü
print_info "Paket yöneticisi kontrolü yapılıyor..."
if command -v yarn &> /dev/null; then
    PKG_MANAGER="yarn"
    print_success "Yarn bulundu"
else
    PKG_MANAGER="npm"
    print_success "npm kullanılacak"
fi

# 3. Bağımlılıkları yükle
echo ""
print_info "Bağımlılıklar yükleniyor..."
if [ "$PKG_MANAGER" = "yarn" ]; then
    yarn install --silent
else
    npm install --silent
fi
print_success "Bağımlılıklar yüklendi"

# 4. TypeScript derle
print_info "Proje derleniyor..."
if [ "$PKG_MANAGER" = "yarn" ]; then
    yarn build
else
    npm run build
fi
print_success "Proje derlendi"

# 5. Kullanıcıdan bilgi al
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  n8n API Bilgilerinizi Girin              ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""

read -p "n8n URL'iniz (örn: https://n8n.example.com): " N8N_URL
read -p "n8n API Anahtarınız: " N8N_API_KEY

# URL'den trailing slash kaldır
N8N_URL="${N8N_URL%/}"

# 6. Konfigürasyon tipi seç
echo ""
echo "Konfigürasyon tipi seçin:"
echo "  1) Global (Tüm Cursor projelerinde kullanılır)"
echo "  2) Proje bazlı (Sadece bu projede kullanılır)"
read -p "Seçiminiz (1/2): " CONFIG_TYPE

# 7. MCP Konfigürasyonu oluştur
DIST_PATH="$SCRIPT_DIR/dist/index.js"

MCP_CONFIG=$(cat <<EOF
{
  "mcpServers": {
    "n8n-cursor-mcp": {
      "command": "node",
      "args": ["$DIST_PATH"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "N8N_API_URL": "$N8N_URL",
        "N8N_API_KEY": "$N8N_API_KEY"
      }
    }
  }
}
EOF
)

if [ "$CONFIG_TYPE" = "1" ]; then
    # Global konfigürasyon - ~/.cursor/mcp.json
    CONFIG_DIR="$HOME/.cursor"
    mkdir -p "$CONFIG_DIR"
    CONFIG_FILE="$CONFIG_DIR/mcp.json"
    
    # Mevcut konfigürasyonu kontrol et
    if [ -f "$CONFIG_FILE" ]; then
        print_warning "Mevcut MCP konfigürasyonu bulundu: $CONFIG_FILE"
        read -p "Üzerine yazılsın mı? (e/h): " OVERWRITE
        if [ "$OVERWRITE" != "e" ]; then
            print_info "Kurulum iptal edildi"
            exit 0
        fi
    fi
    
    echo "$MCP_CONFIG" > "$CONFIG_FILE"
    print_success "Global MCP konfigürasyonu oluşturuldu: $CONFIG_FILE"
else
    # Proje bazlı konfigürasyon
    mkdir -p "$SCRIPT_DIR/.cursor"
    echo "$MCP_CONFIG" > "$SCRIPT_DIR/.cursor/mcp.json"
    print_success "Proje MCP konfigürasyonu oluşturuldu: $SCRIPT_DIR/.cursor/mcp.json"
fi

# 8. Tamamlandı
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ Kurulum Tamamlandı!                    ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
print_info "Sonraki adımlar:"
echo "  1. Cursor'ı tamamen kapatın"
echo "  2. Cursor'ı yeniden açın"
echo "  3. Yeni bir chat açıp şunu yazın: 'n8n bağlantısını kontrol et'"
echo ""
print_info "Örnek kullanımlar:"
echo "  • 'n8n'deki workflow'ları listele'"
echo "  • 'Yeni bir webhook workflow'u oluştur'"
echo "  • 'XYZ workflow'unu aktif et'"
echo ""

