<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    use HasFactory;
    
    protected $guarded = [];
    protected $casts = ['languages' => 'json'];

    public function modules() { return $this->hasMany(Module::class); }
    public function enrollments() { return $this->hasMany(Enrollment::class); }

    public function scopePublished($query) { return $query->where('status', 'published'); }
    public function scopeDraft($query) { return $query->where('status', 'draft'); }
}
