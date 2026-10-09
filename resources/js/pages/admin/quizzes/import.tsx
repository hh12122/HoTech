import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

interface AnswerData {
    text: string;
    isCorrect: boolean;
}

interface QuestionData {
    text: string;
    answers: AnswerData[];
    confidenceScore: number;
}

export default function ImportQuiz({ module }: { module: any }) {
    const [scrapeMethod, setScrapeMethod] = useState<'url' | 'file'>('url');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [scrapedQuestions, setScrapedQuestions] = useState<QuestionData[]>([]);
    const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());

    const { data, setData, post, processing, errors } = useForm({
        questions: [] as QuestionData[],
    });

    const handleScrape = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            if (scrapeMethod === 'url') {
                formData.append('url', url);
            } else if (file) {
                formData.append('file', file);
            }

            const response = await axios.post(route('admin.modules.quiz.scrape', module.id), formData);
            setScrapedQuestions(response.data.questions);
            setSelectedIndexes(new Set(response.data.questions.map((_: any, i: number) => i)));
        } catch (e) {
            console.error('Error scraping:', e);
            alert('Failed to scrape.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (index: number) => {
        const next = new Set(selectedIndexes);
        if (next.has(index)) {
            next.delete(index);
        } else {
            next.add(index);
        }
        setSelectedIndexes(next);
    };

    const handleImport = () => {
        const toImport = scrapedQuestions.filter((_, i) => selectedIndexes.has(i));
        setData('questions', toImport);
        // Using setTimeout to allow state to update before posting
        setTimeout(() => {
            post(route('admin.modules.quiz.import', module.id));
        }, 0);
    };

    return (
        <AppLayout>
            <Head title={`Import Quiz - ${module.title}`} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <h1 className="text-2xl font-bold">Import Quiz for {module.title}</h1>
                
                <div className="bg-card p-6 rounded-lg shadow-sm border space-y-4">
                    <h2 className="text-lg font-semibold">Scrape Options</h2>
                    <div className="flex gap-4 mb-4">
                        <Label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                checked={scrapeMethod === 'url'} 
                                onChange={() => setScrapeMethod('url')} 
                            />
                            From URL
                        </Label>
                        <Label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                checked={scrapeMethod === 'file'} 
                                onChange={() => setScrapeMethod('file')} 
                            />
                            From File (HTML)
                        </Label>
                    </div>

                    {scrapeMethod === 'url' ? (
                        <div className="space-y-2">
                            <Label>Website URL</Label>
                            <Input 
                                type="url" 
                                value={url} 
                                onChange={e => setUrl(e.target.value)} 
                                placeholder="https://example.com/quiz" 
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>HTML File</Label>
                            <Input 
                                type="file" 
                                accept=".html,.htm"
                                onChange={e => setFile(e.target.files?.[0] || null)} 
                            />
                        </div>
                    )}

                    <Button onClick={handleScrape} disabled={loading || (scrapeMethod === 'url' ? !url : !file)}>
                        {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                        Scrape Questions
                    </Button>
                </div>

                {scrapedQuestions.length > 0 && (
                    <div className="bg-card p-6 rounded-lg shadow-sm border space-y-4 mt-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Preview & Select Questions</h2>
                            <Button onClick={handleImport} disabled={processing || selectedIndexes.size === 0}>
                                {processing && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                Import Selected ({selectedIndexes.size})
                            </Button>
                        </div>
                        
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {scrapedQuestions.map((q, i) => (
                                <div key={i} className="flex gap-4 border p-4 rounded-md">
                                    <Checkbox 
                                        checked={selectedIndexes.has(i)}
                                        onCheckedChange={() => handleToggle(i)}
                                    />
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-start justify-between">
                                            <p className="font-medium">{q.text}</p>
                                            <span className={twMerge(
                                                "text-xs px-2 py-1 rounded font-semibold",
                                                q.confidenceScore > 0.8 ? "bg-green-100 text-green-800" :
                                                q.confidenceScore > 0.5 ? "bg-yellow-100 text-yellow-800" :
                                                "bg-red-100 text-red-800"
                                            )}>
                                                {Math.round(q.confidenceScore * 100)}% Confidence
                                            </span>
                                        </div>
                                        <ul className="text-sm space-y-1 list-disc pl-5">
                                            {q.answers.map((a, j) => (
                                                <li key={j}>{a.text} {a.isCorrect && "(Correct)"}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
