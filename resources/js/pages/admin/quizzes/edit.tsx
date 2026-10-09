import React from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function QuizEdit({ quiz }: { quiz: any }) {
    const { data, setData, put, processing, errors } = useForm({
        title: quiz.title,
        pass_threshold: quiz.pass_threshold,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.quizzes.update', quiz.id));
    };

    return (
        <AppLayout>
            <Head title={`Edit Quiz: ${quiz.title}`} />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        {/* Assuming we can go back to module or somewhere */}
                        <Link href={route('dashboard')}>
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Edit Quiz</h1>
                </div>

                <div className="max-w-2xl">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quiz Settings</CardTitle>
                            <CardDescription>Update general settings and passing criteria for this quiz.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Quiz Title</label>
                                    <Input 
                                        value={data.title} 
                                        onChange={e => setData('title', e.target.value)} 
                                        required
                                    />
                                    {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex justify-between">
                                        <span>Pass Threshold (%)</span>
                                        <span className="text-muted-foreground">{data.pass_threshold}%</span>
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            step="5"
                                            value={data.pass_threshold}
                                            onChange={e => setData('pass_threshold', parseInt(e.target.value))}
                                            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                                        />
                                        <Input 
                                            type="number" 
                                            min="0" max="100" 
                                            className="w-20"
                                            value={data.pass_threshold}
                                            onChange={e => setData('pass_threshold', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Changes to the passing threshold are not retroactive for past attempts.
                                    </p>
                                    {errors.pass_threshold && <p className="text-sm text-destructive">{errors.pass_threshold}</p>}
                                </div>
                                
                                <Button type="submit" disabled={processing}>
                                    {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Changes
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
