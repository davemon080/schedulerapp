import React, { useState } from 'react';
import { CreativeAsset } from '../types';
import {
  Image as ImageIcon,
  Maximize2,
  X,
  Download,
  Calendar,
  User,
  Tag,
  ExternalLink
} from 'lucide-react';

interface AssetGalleryProps {
  assets: CreativeAsset[];
}

export const AssetGallery: React.FC<AssetGalleryProps> = ({ assets }) => {
  const [selectedAsset, setSelectedAsset] = useState<CreativeAsset | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = ['all', 'UI Mockup', 'Brand', 'System'];

  const filteredAssets = assets.filter((asset) => {
    if (filterCategory === 'all') return true;
    return asset.category === filterCategory;
  });

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-neutral-950">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Gallery Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-400">
                Design Artifacts & Moodboards
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Sprint 14 Asset Gallery
            </h1>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 p-1 rounded-lg">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 text-xs font-mono rounded-md capitalize transition-colors ${
                  filterCategory === cat
                    ? 'bg-neutral-800 text-white font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Assets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className="group bg-neutral-900/50 border border-neutral-800/80 hover:border-neutral-700 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Image Preview Container */}
              <div className="relative aspect-4/3 overflow-hidden bg-neutral-950">
                <img
                  src={asset.image}
                  alt={asset.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
                />
                <div className="absolute inset-0 bg-neutral-950/20 group-hover:bg-neutral-950/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/90 text-xs font-medium text-white border border-neutral-700/80 shadow-md">
                    <Maximize2 className="w-3.5 h-3.5" />
                    Inspect Asset
                  </span>
                </div>
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-0.5 text-[10px] font-mono text-neutral-300 bg-neutral-900/90 border border-neutral-700/80 rounded backdrop-blur-xs">
                    {asset.category}
                  </span>
                </div>
              </div>

              {/* Asset Metadata Card */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors leading-snug mb-1">
                  {asset.title}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-3">
                  {asset.description}
                </p>

                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                  <span>{asset.dimensions}</span>
                  <span aria-hidden="true">·</span>
                  <span>{asset.author}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedAsset && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={() => setSelectedAsset(null)}
        >
          <div
            className="relative max-w-5xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">
                  {selectedAsset.category}
                </span>
                <h2 className="text-base font-bold text-white mt-0.5">
                  {selectedAsset.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={selectedAsset.image}
                  download={selectedAsset.title.toLowerCase().replace(/\s+/g, '_') + '.jpg'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
              {/* Image View */}
              <div className="flex-1 bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center min-h-[360px]">
                <img
                  src={selectedAsset.image}
                  alt={selectedAsset.title}
                  className="max-h-[60vh] w-auto object-contain rounded-lg"
                />
              </div>

              {/* Sidebar Info */}
              <div className="w-full lg:w-80 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                      Description
                    </h3>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {selectedAsset.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-neutral-800 text-xs font-mono">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Dimensions</span>
                      <span className="text-neutral-200">{selectedAsset.dimensions}</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Creator</span>
                      <span className="text-neutral-200">{selectedAsset.author}</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Updated</span>
                      <span className="text-neutral-200">{selectedAsset.updatedAt}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-800">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAsset.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-xs font-mono bg-neutral-800 text-neutral-300 border border-neutral-700/60"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-[11px] text-neutral-400 font-mono">
                  Asset reviewed and approved for sprint deliverable package.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
