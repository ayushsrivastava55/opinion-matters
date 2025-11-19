#!/bin/bash
set -e

echo "🚀 Setting up Arcium development environment..."

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="/home/vscode/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1

# Install Arcium tooling
curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash
export PATH="/home/vscode/.cargo/bin:$PATH"
arcup install

# Install Node dependencies
cd /workspaces/cyberpunk/app && npm install

echo "✅ Setup complete! You can now run 'arcium localnet' to start testing."
