import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Image as ImageIcon } from 'lucide-react';

export default function CertificateTemplatesIndex({ templates }: { templates: any[] }) {
    return (
        <AppLayout>
            <Head title="Certificate Templates" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                <h1 className="text-2xl font-bold">Certificate Templates</h1>

                <div className="grid gap-6 md:grid-cols-2">
                    {templates.map((template) => (
                        <Card key={template.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="capitalize">{template.pole} Pole</CardTitle>
                                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                        {template.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 text-muted-foreground">
                                    <FileText className="w-8 h-8" />
                                    <div>
                                        <p className="font-medium text-foreground">Standard Template</p>
                                        <p className="text-sm flex items-center gap-1">
                                            {template.logo_url ? (
                                                <><ImageIcon className="w-3 h-3" /> Custom logo uploaded</>
                                            ) : (
                                                'No logo uploaded'
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button asChild>
                                    <Link href={route('admin.certificate-templates.edit', template.id)}>
                                        Edit Template
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
