import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, ExternalLink } from 'lucide-react';

export default function CertificateTemplateEdit({ template }: { template: any }) {
    const { data, setData, post, processing, errors } = useForm({
        _method: 'PUT',
        body_text: template.body_text,
        logo: null as File | null,
    });

    const [previewUrl, setPreviewUrl] = useState<string | null>(template.logo_url);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('logo', file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.certificate-templates.update', template.id), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout>
            <Head title={`Edit ${template.pole} Certificate Template`} />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href={route('admin.certificate-templates.index')}>
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold capitalize">Edit {template.pole} Template</h1>
                    
                    <Button variant="secondary" className="ml-auto" asChild>
                        <a href={route('admin.certificate-templates.preview', template.id)} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Preview PDF
                        </a>
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Template Editor</CardTitle>
                                <CardDescription>HTML and placeholders are supported.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Logo Image</label>
                                        <div className="flex items-start gap-4">
                                            {previewUrl && (
                                                <div className="w-24 h-24 border rounded flex items-center justify-center bg-white overflow-hidden">
                                                    <img src={previewUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                                                </div>
                                            )}
                                            <Input type="file" accept="image/*" onChange={handleFileChange} />
                                        </div>
                                        {errors.logo && <p className="text-sm text-destructive">{errors.logo}</p>}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Body Text (HTML allowed)</label>
                                        <Textarea 
                                            value={data.body_text} 
                                            onChange={e => setData('body_text', e.target.value)} 
                                            className="min-h-[300px] font-mono text-sm"
                                        />
                                        {errors.body_text && <p className="text-sm text-destructive">{errors.body_text}</p>}
                                    </div>

                                    <Button type="submit" disabled={processing}>
                                        {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Save Changes
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Dynamic Placeholders</CardTitle>
                                <CardDescription>Use these tags in the body text.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex flex-col">
                                        <code className="bg-muted px-1.5 py-0.5 rounded w-max mb-1">
                                            {'{student_name}'}
                                        </code>
                                        <span className="text-muted-foreground">The full name of the learner.</span>
                                    </li>
                                    <li className="flex flex-col">
                                        <code className="bg-muted px-1.5 py-0.5 rounded w-max mb-1">
                                            {'{course_title}'}
                                        </code>
                                        <span className="text-muted-foreground">The name of the completed course.</span>
                                    </li>
                                    <li className="flex flex-col">
                                        <code className="bg-muted px-1.5 py-0.5 rounded w-max mb-1">
                                            {'{date}'}
                                        </code>
                                        <span className="text-muted-foreground">The date of completion.</span>
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
