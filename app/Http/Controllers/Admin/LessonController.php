<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Module;
use App\Models\Lesson;
use App\Http\Requests\Admin\StoreLessonRequest;
use App\Http\Requests\Admin\UpdateLessonRequest;
use App\Http\Requests\Admin\ReorderLessonsRequest;
use Illuminate\Http\RedirectResponse;

class LessonController extends Controller
{
    public function store(Module $module, StoreLessonRequest $request): RedirectResponse
    {
        $module->lessons()->create(array_merge($request->validated(), [
            'sort_order' => $module->lessons()->max('sort_order') + 1
        ]));
        return redirect()->back();
    }

    public function update(Lesson $lesson, UpdateLessonRequest $request): RedirectResponse
    {
        $lesson->update($request->validated());
        return redirect()->back();
    }

    public function destroy(Lesson $lesson): RedirectResponse
    {
        $lesson->delete();
        return redirect()->back();
    }

    public function reorder(ReorderLessonsRequest $request): RedirectResponse
    {
        foreach ($request->validated()['ids'] as $index => $id) {
            Lesson::where('id', $id)->update(['sort_order' => $index]);
        }
        return redirect()->back();
    }
}
