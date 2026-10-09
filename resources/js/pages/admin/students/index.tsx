import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MoreHorizontal, Search, CheckCircle, XCircle } from 'lucide-react';

export default function StudentsIndex({ students, filters }: { students: any, filters: any }) {
    const [search, setSearch] = useState(filters.search || '');
    const [isAddOpen, setIsAddOpen] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('admin.students.index'), { search }, { preserveState: true });
    };

    const handleToggleActive = (id: number) => {
        router.put(route('admin.students.toggle-active', id), {}, { preserveScroll: true });
    };

    const addForm = useForm({
        name: '',
        email: '',
        pole: '',
    });

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post(route('admin.students.store'), {
            onSuccess: () => {
                setIsAddOpen(false);
                addForm.reset();
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Manage Learners" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Learner Accounts</h1>
                    <Button onClick={() => setIsAddOpen(true)}>Add Learner</Button>
                </div>

                <div className="flex gap-4 mb-4">
                    <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-sm">
                        <Input 
                            placeholder="Search by name or email..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                        />
                        <Button type="submit" variant="secondary">
                            <Search className="w-4 h-4 mr-2" />
                            Search
                        </Button>
                    </form>
                </div>

                <div className="border rounded-md bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Enrolled Courses</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Login</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.data.map((student: any) => (
                                <TableRow key={student.id}>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell>{student.email}</TableCell>
                                    <TableCell>{student.enrolledCoursesCount}</TableCell>
                                    <TableCell>
                                        {student.isActive ? (
                                            <span className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-1"/> Active</span>
                                        ) : (
                                            <span className="flex items-center text-red-600"><XCircle className="w-4 h-4 mr-1"/> Inactive</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{student.lastLoginAt || 'Never'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={route('admin.students.show', student.id)}>View Details</Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleActive(student.id)}>
                                                    Toggle Status
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {students.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No learners found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                {/* Pagination (Simplified for now) */}
                <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {students.from || 0} to {students.to || 0} of {students.total} entries
                    </div>
                    <div className="flex gap-2">
                        {students.prev_page_url && (
                            <Button variant="outline" size="sm" onClick={() => router.get(students.prev_page_url)}>Previous</Button>
                        )}
                        {students.next_page_url && (
                            <Button variant="outline" size="sm" onClick={() => router.get(students.next_page_url)}>Next</Button>
                        )}
                    </div>
                </div>
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Learner</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input 
                                value={addForm.data.name} 
                                onChange={e => addForm.setData('name', e.target.value)} 
                                required
                            />
                            {addForm.errors.name && <p className="text-sm text-destructive">{addForm.errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input 
                                type="email"
                                value={addForm.data.email} 
                                onChange={e => addForm.setData('email', e.target.value)} 
                                required
                            />
                            {addForm.errors.email && <p className="text-sm text-destructive">{addForm.errors.email}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={addForm.processing}>Add Learner</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
