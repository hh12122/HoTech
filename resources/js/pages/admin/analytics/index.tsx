import React from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, CheckCircle, GraduationCap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface Props {
    totalActiveStudents: number;
    globalCompletionRate: number;
    globalQuizPassRate: number;
    courseMetrics: Array<{
        courseTitle: string;
        enrolledStudents: number;
        completionRate: number;
    }>;
    monthlyEnrollments: Array<{
        name: string;
        students: number;
    }>;
    pole: string | null;
}

export default function AnalyticsIndex({ totalActiveStudents, globalCompletionRate, globalQuizPassRate, courseMetrics, monthlyEnrollments, pole }: Props) {
    const handlePoleChange = (value: string) => {
        router.get(route('admin.analytics.index'), { pole: value === 'all' ? '' : value }, { preserveState: true });
    };

    return (
        <AppLayout>
            <Head title="Learner Analytics" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Learner Analytics</h1>
                    <Select value={pole || 'all'} onValueChange={handlePoleChange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by pole" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Poles</SelectItem>
                            <SelectItem value="telephonie">Téléphonie</SelectItem>
                            <SelectItem value="energie">Énergie</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Students (30d)</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalActiveStudents}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Global Completion Rate</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{globalCompletionRate}%</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Quiz Pass Rate</CardTitle>
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{globalQuizPassRate}%</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Course Enrollment & Completion</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={courseMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="courseTitle" tick={{fill: 'hsl(var(--foreground))', fontSize: 12}} />
                                    <YAxis tick={{fill: 'hsl(var(--foreground))', fontSize: 12}} />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                    />
                                    <Bar dataKey="enrolledStudents" name="Enrolled" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="completionRate" name="Completion %" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Monthly Enrollments</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyEnrollments} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="name" tick={{fill: 'hsl(var(--foreground))', fontSize: 12}} />
                                    <YAxis tick={{fill: 'hsl(var(--foreground))', fontSize: 12}} />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                    />
                                    <Line type="monotone" dataKey="students" name="New Students" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
