import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { useAppState } from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { invoke } from '@tauri-apps/api/core';
import {
  Search,
  FileText,
  Folder,
  ExternalLink,
  ChevronLeft,
  Filter
} from 'lucide-react';

interface SearchResult {
  id: number;
  filename: string;
  current_path: string;
  previous_path?: string;
  file_type: string;
  category?: string;
  tags?: string[];
  summary?: string;
  modified_at: string;
}

export function SearchScreen() {
  const { t } = useTranslation();
  const { setIntent } = useAppState();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [wasOnDesktop, setWasOnDesktop] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const searchResults = await invoke<SearchResult[]>('search_files', {
        query: query.trim(),
        filters: wasOnDesktop ? { wasOnDesktop: true } : null,
      });
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleBack = () => {
    setIntent(null);
  };

  const openFile = async (path: string) => {
    try {
      // Use Tauri shell plugin to open file
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(path);
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  const showInFolder = async (path: string) => {
    try {
      // Use Tauri shell plugin to reveal in explorer
      const { open } = await import('@tauri-apps/plugin-shell');
      const folderPath = path.substring(0, path.lastIndexOf('\\'));
      await open(folderPath);
    } catch (error) {
      console.error('Error opening folder:', error);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-hidden">
      <div className="max-w-3xl mx-auto w-full h-full flex flex-col space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 w-fit"
          onClick={handleBack}
        >
          <ChevronLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>

        {/* Search input */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-12 pr-24 h-14 text-lg"
            />
            <Button
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Search examples */}
          <p className="text-sm text-muted-foreground">
            {t('search.examples')}
          </p>

          {/* Filter toggle */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              {t('search.filters')}
            </Button>

            {showFilters && (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={wasOnDesktop}
                  onCheckedChange={(checked) => setWasOnDesktop(checked as boolean)}
                />
                <span className="text-sm">{t('search.wasOnDesktop')}</span>
              </label>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto space-y-4">
          {results.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t('search.results', { count: results.length })}
              </p>
              {results.map(result => (
                <Card key={result.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{result.filename}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Folder className="h-3 w-3" />
                          <span className="truncate selectable">{result.current_path}</span>
                        </div>
                        {result.previous_path && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('search.previousLocation')}: {result.previous_path}
                          </p>
                        )}
                        {result.summary && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {result.summary}
                          </p>
                        )}
                        {result.tags && result.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {result.tags.map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-muted rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openFile(result.current_path)}
                        >
                          {t('search.open')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => showInFolder(result.current_path)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : query && !isSearching ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('search.noResults')}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
