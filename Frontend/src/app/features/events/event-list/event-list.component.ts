import { Component,OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.css']
})
export class EventListComponent implements OnInit, OnDestroy {
  currentTime = '';
  private timer: any;

  events = [1, 2];

  friendlyMatches = [
    { name: 'Match 1', sub: 'Match 1', teamA: 'Team A', teamB: 'Team B', time: '15:00' },
    { name: 'Match 2', sub: 'Match 2', teamA: 'Team A', teamB: 'Team B', time: '12:55' },
    { name: 'Match 3', sub: 'Match 3', teamA: 'Team A', teamB: 'Team B', time: '13:59' },
  ];

  ngOnInit(): void {
    this.updateTime();
    this.timer = setInterval(() => this.updateTime(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  updateTime(): void {
    this.currentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
