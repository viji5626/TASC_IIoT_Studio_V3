import React from 'react';

export const PANEL_ICONS: Record<string, React.ReactNode> = {
  button: <i className="fas fa-hand-pointer"></i>,
  switch: <i className="fas fa-toggle-on"></i>,
  slider: <i className="fas fa-sliders"></i>,
  text_input: <i className="fas fa-keyboard"></i>,
  text_output: <i className="fas fa-align-left"></i>,
  node_status: <i className="fas fa-[#3b82f6] fa-rss"></i>,
  combo_box: <i className="fas fa-list-ul"></i>,
  radio_buttons: <i className="fas fa-circle-dot"></i>,
  led: <i className="fas fa-lightbulb"></i>,
  multi_state: <i className="fas fa-list-check"></i>,
  progress: <i className="fas fa-battery-half"></i>,
  gauge: <i className="fas fa-gauge-high"></i>,
  color_picker: <i className="fas fa-palette"></i>,
  date_picker: <i className="fas fa-calendar-days"></i>,
  line_graph: <i className="fas fa-chart-line"></i>,
  log: <i className="fas fa-terminal"></i>,
  static_text: <i className="fas fa-font"></i>,
  screen_jump: <i className="fas fa-rectangle-list"></i>,
  image: <i className="fas fa-file-image"></i>,
  clock: <i className="fas fa-clock"></i>,
  pipe: <i className="fas fa-grip-lines"></i>,
  shape: <i className="fas fa-shapes"></i>,
  alarm_log: <i className="fas fa-history"></i>
};

export const DEFAULT_COLORS = {
  primary: '#f59e0b', // Amber-500
  accent: '#2d5db1',
  bgDark: '#0c0c0c',
  cardBg: '#121212',
  border: '#2a2a2a',
};
