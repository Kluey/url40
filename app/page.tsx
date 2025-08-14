"use client";
import React, { useState, useEffect, FormEvent, KeyboardEvent } from 'react';
import { CornerDownLeft, FileText, Clock, Trash2, Github, Copy, Check } from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { useCopyToClipboard } from './hooks/useCopyToClipboard';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { EmptyState } from './components/EmptyState';
import { ThemeToggle } from './components/ThemeToggle';
import { ArticleCard } from './components/ArticleCard';
import { SummaryRenderer } from './components/SummaryRenderer';

interface Article {
  id: string;
  url: string;
  summary: string;
  timestamp?: string;
  wordCount?: number;
}

interface ErrorType {
  data?: { error?: string };
  status?: number;
}

export default function Home() {
  const [article, setArticle] = useState<Article>({ id: '', url: '', summary: '' });
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<ErrorType | null>(null);
  
  const { isDark, toggleTheme } = useTheme();
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  const saveArticleToStorage = (articles: Article[]) => {
    try {
      localStorage.setItem('articles', JSON.stringify(articles));
    } catch (storageError) {
      console.error('Failed to save to localStorage:', storageError);
    }
  };

  useEffect(() => {
    const articlesFromLocalStorage = localStorage.getItem('articles');
    if (articlesFromLocalStorage) {
      try {
        const parsed = JSON.parse(articlesFromLocalStorage);
        if (Array.isArray(parsed)) {
          const migratedArticles = parsed.map((article: Article) => ({
            ...article,
            id: article.id || `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }));
          setAllArticles(migratedArticles);
          
          if (migratedArticles.some((article: Article) => article.id.startsWith('migrated-'))) {
            saveArticleToStorage(migratedArticles);
          }
        }
      } catch (parseError) {
        console.error('Failed to parse localStorage articles:', parseError);
        localStorage.removeItem('articles');
      }
    }
  }, []);

  const getSummary = async ({ articleUrl }: { articleUrl: string }) => {
    try {
      setIsFetching(true);
      setError(null);
      
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: articleUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError({ 
          data: errorData,
          status: response.status 
        });
        return { data: null, error: true };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (networkError) {
      console.error('Network error:', networkError);
      setError({ 
        data: { error: 'Network error occurred' },
        status: 500 
      });
      return { data: null, error: true };
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!url.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const existingArticle = allArticles.find((item) => item.url === url);
      if (existingArticle) {
        setArticle(existingArticle);
        setUrl(existingArticle.url);
        setIsSubmitting(false);
        return;
      }

      const { data, error: summaryError } = await getSummary({ articleUrl: url });
      
      if (summaryError || !data?.summary) {
        setIsSubmitting(false);
        return;
      }

      const newArticle: Article = {
        id: `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url,
        summary: data.summary,
        timestamp: new Date().toISOString(),
        wordCount: data.wordCount
      };

      setArticle(newArticle);
      const updatedArticles = [newArticle, ...allArticles];
      setAllArticles(updatedArticles);
      saveArticleToStorage(updatedArticles);
      
    } catch (error) {
      console.error('Error processing article:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    copyToClipboard(text, id);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent<HTMLFormElement>);
    }
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all article history?')) {
      localStorage.removeItem('articles');
      setAllArticles([]);
      setArticle({ id: '', url: '', summary: '' });
      setUrl('');
    }
  };

  const selectArticle = (selectedArticle: Article) => {
    setArticle(selectedArticle);
    setUrl(selectedArticle.url);
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'dark bg-gray-900' : 'bg-slate-50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex items-center justify-between py-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white">
              URL<span className="text-red-600">.</span>40
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            <a
              href="https://github.com/Kluey/url40"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <Github className="w-5 h-5" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </header>

        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Paste <span className="text-red-600">Link</span>,
            Get <span className="text-red-600">Summary</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Transform any article into comprehensive summaries with AI-powered analysis
          </p>
        </div>

        {/* URL Input Form */}
        <div className="max-w-4xl mx-auto mb-8">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-red-500 focus-within:border-red-500 transition-all">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste article URL here..."
                disabled={isSubmitting || isFetching}
                className="flex-1 px-4 py-4 text-gray-900 dark:text-white bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-500 dark:placeholder-gray-400"
                required
              />
              <button
                type="submit"
                disabled={!url.trim() || isSubmitting || isFetching}
                className="m-2 p-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {isSubmitting || isFetching ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <CornerDownLeft className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Results Section */}
        <div className="max-w-4xl mx-auto mb-8">
          {/* Summary Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-red-600" />
                  Summary
                  {article.wordCount && (
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({article.wordCount} words)
                    </span>
                  )}
                </h3>
                {article.summary && (
                  <button
                    onClick={() => handleCopy(article.summary, 'summary')}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Copy summary"
                  >
                    {isCopied('summary') ? (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
              {article.timestamp && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatTimestamp(article.timestamp)}
                </p>
              )}
            </div>
            <div className="p-6 h-96 overflow-y-auto scrollbar-custom">
              {isFetching ? (
                <LoadingSpinner text="Analyzing article..." />
              ) : error ? (
                <ErrorMessage
                  title="Failed to process article"
                  message={
                    'data' in error &&
                    typeof error.data === 'object' &&
                    error.data !== null &&
                    'error' in error.data
                      ? (error.data as { error: string }).error
                      : 'Please check the URL and try again.'
                  }
                />
              ) : article.summary ? (
                <SummaryRenderer content={article.summary} />
              ) : (
                <EmptyState
                  icon={<FileText className="w-12 h-12" />}
                  title="Ready to summarize"
                  description="Enter an article URL above to get started with AI-powered summarization"
                />
              )}
            </div>
          </div>
        </div>

        {/* History Section */}
        {allArticles.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Recent Articles
              </h3>
              <button
                onClick={clearHistory}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear History</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {allArticles.map((item) => (
                <ArticleCard
                  key={item.id}
                  url={item.url}
                  summary={item.summary}
                  onClick={() => selectArticle(item)}
                  onCopy={() => handleCopy(item.url, item.url)}
                  isCopied={isCopied(item.url)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
