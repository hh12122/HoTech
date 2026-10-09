import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function StudentShow({ student }: { student: any }) {
    return (
        <AppLayout>
            <Head title={`Learner: ${student.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href={route('admin.students.index')}>
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold">{student.name}</h1>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{student.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <p className="font-medium flex items-center">
                                    {student.isActive ? (
                                        <span className="text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> Active</span>
                                    ) : (
                                        <span className="text-red-600 flex items-center"><XCircle className="w-4 h-4 mr-1" /> Inactive</span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Last Login</p>
                                <p className="font-medium">{student.lastLoginAt || 'Never'}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Course Enrollments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Enrolled At</TableHead>
                                    <TableHead>Completion</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {student.enrollments.map((enrollment: any, idx: number) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{enrollment.courseTitle}</TableCell>
                                        <TableCell>{enrollment.enrolledAt}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-full bg-secondary rounded-full h-2.5">
                                                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${enrollment.completionRate}%` }}></div>
                                                </div>
                                                <span className="text-sm">{enrollment.completionRate}%</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {student.enrollments.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">
                                            Not enrolled in any courses.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
