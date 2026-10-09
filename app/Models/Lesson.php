<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lesson extends Model
{
    use HasFactory;
    
    protected $guarded = [];

    public function module() { return $this->belongsTo(Module::class); }
    public function progresses() { return $this->hasMany(LessonProgress::class); }

    public function scopeOrdered($query) { return $query->orderBy('sort_order'); }
}
