import { app, BrowserWindow, Menu, Tray, nativeImage } from "electron";
import path from "node:path";

let tray: Tray | null = null;
const vaultApp = app as typeof app & { isQuitting?: boolean };

export function createTray(mainWindow: BrowserWindow) {
  // Create tray icon from app icon
  const iconPath = path.join(__dirname, "../../../resources/icon.png");
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show",
      click: () => {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
        }
      }
    },
    {
      label: "Open Quick Actions",
      click: () => {
        // Send message to create quick actions window
        mainWindow.webContents.send("open-quick-actions");
      }
    },
    { type: "separator" },
    {
      label: "Quit Vault",
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // Show app when tray icon is clicked
  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Handle minimize to tray
  mainWindow.on("close", (event) => {
    if (!vaultApp.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  return tray;
}

export function toggleTrayVisibility() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
