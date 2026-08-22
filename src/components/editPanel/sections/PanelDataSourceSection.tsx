import React from 'react';
import { AppState, PanelType } from '../../../types';
import TopicAutocompleteInput from '../../TopicAutocompleteInput';
import DriverTagSelector from '../../DriverTagSelector';

interface PanelDataSourceSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  dataSourceMode: 'mqtt' | 'driver';
  setDataSourceMode: (mode: 'mqtt' | 'driver') => void;
  appState?: AppState;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  isActionable: boolean;
  isStaticText: boolean;
  isClock: boolean;
  isScreenJump: boolean;
  isLineGraph: boolean;
}

export const PanelDataSourceSection: React.FC<PanelDataSourceSectionProps> = ({
  formData,
  setFormData,
  dataSourceMode,
  setDataSourceMode,
  appState,
  handleChange,
  isActionable,
  isStaticText,
  isClock,
  isScreenJump,
  isLineGraph
}) => {
  if (isStaticText || isClock || isScreenJump) return null;

  return (
    <div className="space-y-4">
      {/* ─── DATA SOURCE TOGGLE ─────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Data Source
          </label>
          <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1 space-x-1">
            <button
              type="button"
              onClick={() => {
                setDataSourceMode('mqtt');
                setFormData((prev: any) => ({ ...prev, dataSourceMode: 'mqtt' }));
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dataSourceMode === 'mqtt'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fas fa-rss mr-1.5 text-[10px]"></i>MQTT
            </button>
            <button
              type="button"
              onClick={() => {
                setDataSourceMode('driver');
                setFormData((prev: any) => ({ ...prev, dataSourceMode: 'driver' }));
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dataSourceMode === 'driver'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fas fa-microchip mr-1.5 text-[10px]"></i>Driver Tag
            </button>
          </div>
        </div>

        {/* Driver Tag selectors — only shown when Driver mode is active and NOT for line_graph */}
        {dataSourceMode === 'driver' && !isLineGraph && (
          <div className="space-y-3 bg-violet-500/5 border border-violet-500/20 rounded-xl p-3">
            <DriverTagSelector
              appState={appState!}
              selectedTagId={formData.driverTagId}
              onChange={(tagId) => setFormData((prev: any) => ({ ...prev, driverTagId: tagId }))}
              label="READ TAG (Data Source)"
              placeholder="Select a driver tag..."
            />
            {/* Write tag — only for control widgets */}
            {[
              'button', 'switch', 'slider', 'combo_box', 'radio_buttons', 'text_input'
            ].includes(formData.type) && (
              <DriverTagSelector
                appState={appState!}
                selectedTagId={formData.driverWriteTagId}
                onChange={(tagId) => setFormData((prev: any) => ({ ...prev, driverWriteTagId: tagId }))}
                label="WRITE TAG (Command Output)"
                placeholder="Select write tag (optional)..."
              />
            )}
            {(!appState?.driverTags || appState.driverTags.length === 0) && (
              <p className="text-[10px] text-violet-400/70 text-center">
                <i className="fas fa-info-circle mr-1"></i>
                Go to <strong>Data Driver Settings → Driver Tag Manager</strong> to configure driver tags first.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Topic Configuration (Hidden for SCREEN_JUMP and STATIC_TEXT, and when Driver mode is active) */}
      {dataSourceMode === 'mqtt' && (
        <>
          <div className={`grid grid-cols-1 ${isActionable ? 'sm:grid-cols-2' : ''} gap-4`}>
            <TopicAutocompleteInput
              name="topic"
              label="MQTT Subscribe Topic (Read) *"
              direction="subscribe"
              value={formData.topic || ''}
              onChange={(val) => setFormData((prev: any) => ({ ...prev, topic: val }))}
              appState={appState}
              required
              placeholder="e.g. myfactory123/v1/jay/sub"
            />

            {isActionable && (
              <TopicAutocompleteInput
                name="publishTopic"
                label="MQTT Publish Topic (Write)"
                direction="publish"
                value={formData.publishTopic || ''}
                onChange={(val) => setFormData((prev: any) => ({ ...prev, publishTopic: val }))}
                appState={appState}
                isPublishTopic
                placeholder="Defaults to subscribe topic if blank"
              />
            )}
          </div>

          <div className="flex items-center space-x-3">
            <input 
              type="checkbox"
              id="disablePrefix"
              name="disableDashboardPrefix"
              checked={formData.disableDashboardPrefix || false}
              onChange={handleChange}
              className="w-4 h-4 accent-amber-500 rounded"
            />
            <label htmlFor="disablePrefix" className="text-sm text-gray-300">
              Disable dashboard topic prefix
            </label>
          </div>
        </>
      )}
    </div>
  );
};
