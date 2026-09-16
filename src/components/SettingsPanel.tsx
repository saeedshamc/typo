import { useTypingStore } from "../store/useTypingStore";
import type { CaretStyle } from "../types";

export function SettingsToggle() {
  const settingsOpen = useTypingStore((s) => s.settingsOpen);
  const setSettingsOpen = useTypingStore((s) => s.setSettingsOpen);
  return (
    <button type="button" className="settings-toggle" onClick={() => setSettingsOpen(!settingsOpen)}>
      {settingsOpen ? "بستن تنظیمات" : "تنظیمات"}
    </button>
  );
}

export function SettingsPanel() {
  const settings = useTypingStore((s) => s.settings);
  const updateSettings = useTypingStore((s) => s.updateSettings);
  const settingsOpen = useTypingStore((s) => s.settingsOpen);

  if (!settingsOpen) return null;

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>تنظیمات</h3>
      </div>

      <label className="settings-row">
        <span>اندازه فونت تایپ ({settings.fontSizePx}px)</span>
        <input
          type="range"
          min={16}
          max={36}
          value={settings.fontSizePx}
          onChange={(e) => updateSettings({ fontSizePx: Number(e.target.value) })}
        />
      </label>

      <label className="settings-row">
        <span>صدای خطا</span>
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
        />
      </label>

      <label className="settings-row">
        <span>حساس به حروف بزرگ/کوچک</span>
        <input
          type="checkbox"
          checked={settings.caseSensitive}
          onChange={(e) => updateSettings({ caseSensitive: e.target.checked })}
        />
      </label>

      <label className="settings-row">
        <span>استایل نشانگر</span>
        <select
          value={settings.caretStyle}
          onChange={(e) => updateSettings({ caretStyle: e.target.value as CaretStyle })}
        >
          <option value="underline">خط زیر</option>
          <option value="block">بلوک</option>
        </select>
      </label>
    </div>
  );
}
