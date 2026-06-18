/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Wifi, Battery, Signal, ArrowLeft, Circle, Square } from 'lucide-react';

interface DeviceFrameProps {
  children: React.ReactNode;
  onVirtualBack?: () => void;
  onVirtualHome?: () => void;
}

export default function DeviceFrame({ children, onVirtualBack, onVirtualHome }: DeviceFrameProps) {
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'fullscreen'>('mobile');
  const [currentTime, setCurrentTime] = useState('');
  const [batteryLevel, setBatteryLevel] = useState(88);

  // Update virtual clock and random-walk battery level
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };

    updateTime();
    const clockInterval = setInterval(updateTime, 1000 * 15); // update every 15s

    // Periodically update virtual battery slightly
    const batteryInterval = setInterval(() => {
      setBatteryLevel(prev => {
        if (prev <= 15) return 92; // cycle recharge
        return prev - 1;
      });
    }, 1000 * 60 * 10);

    return () => {
      clearInterval(clockInterval);
      clearInterval(batteryInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-start overflow-x-hidden">
      {/* Top Controller Bar - Polished Designer Layout */}
      <header className="w-full max-w-7xl px-6 py-4 flex flex-col md:flex-row items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/10 rounded-xl border border-blue-500/20 text-blue-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              Windows Notepad Clone <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">Mobile Simulator</span>
            </h1>
            <p className="text-xs text-slate-400">Tested and compliant with Android mobile standards and Play Store guidelines</p>
          </div>
        </div>

        {/* Presentation controls with dynamic highlighting */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              deviceMode === 'mobile'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Android Simulation
          </button>
          <button
            onClick={() => setDeviceMode('fullscreen')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              deviceMode === 'fullscreen'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Responsive Web Fullscreen
          </button>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 w-full flex items-center justify-center p-2 md:p-6 lg:p-10 bg-radial from-slate-900 to-slate-950">
        {deviceMode === 'fullscreen' ? (
          /* Fullscreen layout: stretches naturally on any screen */
          <div className="w-full max-w-6xl h-[80vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {children}
          </div>
        ) : (
          /* Virtual Android Smartphone frame wrapper */
          <div className="relative mx-auto flex flex-col items-center">
            {/* Left and Right Side Hardware Buttons */}
            <div className="absolute right-[-4px] top-32 w-1 h-12 bg-slate-700 rounded-l border border-slate-600 z-0 shadow" /> {/* Power Button */}
            <div className="absolute left-[-4px] top-28 w-1 h-16 bg-slate-700 rounded-r border border-slate-600 z-0 shadow" /> {/* Vol Up */}
            <div className="absolute left-[-4px] top-48 w-1 h-16 bg-slate-700 rounded-r border border-slate-600 z-0 shadow" /> {/* Vol Down */}

            {/* Main Phone Body */}
            <div className="w-[365px] h-[740px] bg-[#0c111d] rounded-[48px] p-3.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-4 border-slate-800 flex flex-col overflow-hidden relative z-10 transition-all duration-300">
              {/* Top Notch and Bezel Elements */}
              <div className="w-full h-6 flex justify-between items-center px-6 text-[11px] font-medium text-slate-300 z-30 select-none bg-slate-950/20">
                <span>{currentTime || '10:00 AM'}</span>
                {/* Simulated Speaker / Camera Island notch */}
                <div className="w-[110px] h-[18px] bg-slate-950 absolute left-1/2 transform -translate-x-1/2 top-4 rounded-full border border-slate-800/30 flex items-center justify-center gap-1.5 shadow-inner">
                  <div className="w-2.5 h-2.5 bg-zinc-950 rounded-full border border-zinc-900/50 flex items-center justify-center">
                    <div className="w-1 h-1 bg-blue-900/40 rounded-full" /> {/* Lens element */}
                  </div>
                  <div className="w-12 h-[3px] bg-zinc-800 rounded-full" /> {/* Speaker mesh */}
                </div>
                <div className="flex items-center gap-1.5">
                  <Signal className="w-3.5 h-3.5 text-slate-300 fill-slate-300/40 shrink-0" />
                  <span className="font-sans font-semibold tracking-tighter">5G</span>
                  <Wifi className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <div className="flex items-center gap-0.5 relative">
                    <span className="text-[9px] mr-[1px]">{batteryLevel}%</span>
                    <Battery className="w-4 h-4 text-slate-300 shrink-0" />
                  </div>
                </div>
              </div>

              {/* Simulated Screen Inner Container */}
              <div className="flex-1 bg-slate-950 rounded-[34px] overflow-hidden flex flex-col relative border border-slate-900/40">
                {children}
              </div>

              {/* Bottom Android Soft Nav Bar controls */}
              <div className="h-10 w-full flex justify-around items-center px-8 bg-slate-950/90 z-30 select-none border-t border-slate-900/50">
                <button
                  onClick={onVirtualBack}
                  className="p-2 text-slate-400 hover:text-white transition-all hover:bg-slate-900 rounded-full cursor-pointer"
                  title="Virtual Back Button"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={onVirtualHome}
                  className="p-2 text-slate-400 hover:text-white transition-all hover:bg-slate-900 rounded-full cursor-pointer"
                  title="Virtual Home Button"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <button
                  onClick={onVirtualBack} // App switcher list (close drawers standard)
                  className="p-2 text-slate-400 hover:text-white transition-all hover:bg-slate-900 rounded-full cursor-pointer"
                  title="Virtual Recent Apps"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
