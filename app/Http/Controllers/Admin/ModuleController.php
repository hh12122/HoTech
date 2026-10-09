<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Module;
use App\Http\Requests\Admin\StoreModuleRequest;
use App\Http\Requests\Admin\UpdateModuleRequest;
use App\Http\Requests\Admin\ReorderModulesRequest;
use Illuminate\Http\RedirectResponse;

class ModuleController extends Controller
{
    public function store(Course $course, StoreModuleRequest $request): RedirectResponse
    {
        $course->modules()->create(array_merge($request->validated(), [
            'sort_order' => $course->modules()->max('sort_order') + 1
        ]));
        return redirect()->back();
    }

    public function update(Module $module, UpdateModuleRequest $request): RedirectResponse
    {
        $module->update($request->validated());
        return redirect()->back();
    }

    public function destroy(Module $module): RedirectResponse
    {
        $module->delete();
        return redirect()->back();
    }

    public function reorder(ReorderModulesRequest $request): RedirectResponse
    {
        foreach ($request->validated()['ids'] as $index => $id) {
            Module::where('id', $id)->update(['sort_order' => $index]);
        }
        return redirect()->back();
    }
}
