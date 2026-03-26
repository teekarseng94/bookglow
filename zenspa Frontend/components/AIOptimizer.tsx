import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { Button } from './Button';
import { OptimizationResult } from '../types';
import { PRIMARY_GREEN } from '../constants';

export const AIOptimizer: React.FC = () => {
  const [businessType, setBusinessType] = useState('');
  const [challenges, setChallenges] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const handleOptimize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessType) return;
    
    setLoading(true);
    const data = await geminiService.optimizeSchedule(businessType, challenges);
    setResult(data);
    setLoading(false);
  };

  return (
    <div id="ai-tools" className="py-20 bg-slate-50 border-y border-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full uppercase tracking-widest mb-4 inline-block transition-colors">New Feature</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-slate-900">AI Schedule Optimizer</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Tell our AI about your business, and we'll suggest the perfect scheduling flow for your specific industry.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 transition-colors">
            <form onSubmit={handleOptimize} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">What's your business type?</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  placeholder="e.g. Luxury Day Spa, Yoga Studio, Mobile Massage"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Primary scheduling challenge?</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  placeholder="e.g. Too many last-minute cancellations, hard to manage multiple staff calendars..."
                  rows={3}
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Analyzing with AI...' : 'Generate AI Strategy'}
              </Button>
            </form>
          </div>

          <div className="relative">
            {result ? (
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-green-100 transition-colors animate-in fade-in slide-in-from-right duration-500">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Your Tailored Strategy
                </h3>
                <p className="text-slate-700 leading-relaxed mb-6 italic">"{result.strategy}"</p>
                <div className="space-y-4">
                  {result.tips.map((tip, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-6 h-6 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0 font-bold text-xs">{i+1}</div>
                      <p className="text-slate-600 text-sm">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 transition-colors">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z"/>
                </svg>
                <p>Submit your business details to see your customized scheduling strategy.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};